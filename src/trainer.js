//Holds the model trainer for OpenAI's API Fine Tuning
//How it works (General Outline): 
//  1. The bot records messages sent to the chatroom as normal, and sends it out to OpenAI via !post command call
//     However, unlike normal, the bot will not flush the prompt immediately.
//  2. OpenAI sends back a response and is evaluated by their content filter and by human eyes.
//     Posting the response will be the same as normal
//  3. The bot, through the Discord channel it's connected to, will listen for a !record command
//     If it is found, the bot will write down the prompt and its response inside of a JSONL file
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

export class Trainer {

    // The object that will hold the prompt and response from the channel
    // Format: {
    //          "channel_name": {
    // (probably time it was made) identifier {
    //                              "prompt": (recorded prompt goes here)
    //                              "response": (ditto as above but with response)
    //                              },
    //          }
    //         };
    #training_data;
    #data_base;
    #finetune_id;
    constructor(db) {
        this.#training_data = {};
        this.#data_base = db;
        this.#finetune_id = '';
    }

    //adds a prompt from a channel to the list of training data
    //@param   target        The channel we are recording the prompt from
    //@param   prompt        The prompt we sent out to OpenAI's GPT-3 API for a response
    //@param   time_posted   The time the request to make the prompt went out to GPT-3
    addPromptToTrainingData(target, prompt, time_posted) {
        const data_pt = {
            [time_posted]: {
                "prompt": prompt + "\n\n###\n\n",
                "response": ""
            }
        };
        this.#training_data[target] = data_pt;
    }

    //records the response from GPT-3 to the channel and stores it into the correct object
    //@param   target        The channel we are recording the prompt from
    //@param   resp          The response from the channel that was sent out that we want to record
    //@param   time_posted   The time that the message was posted to the API
    recordResponse(target, resp, time_posted) { this.#training_data[target][time_posted]["response"] = " " + resp + "####\n\n\n"; }

    //removes a channel from the list of training data sets. Usually done when a model has been made for that channel and
    //we no longer need to keep the data
    //@param   target   The channel we are recording the prompt from 
    deleteChannel(target) { delete this.#training_data[target]; }

    //writes the training data to a JSON Lines file (.jsonl) that will be sent out to OpenAI to make a model
    writeTrainingDataToFile(target) {
        //for each element in the channel's prompt/response array, make an object
        //and then pipe it into the file
        Object.keys(this.#training_data[target]).forEach(key => {
            const item = this.#training_data[target][key];
            const obj = {
                "prompt": item.prompt,
                "completion": item.response
            };
            fs.appendFile('./data/training.jsonl', JSON.stringify(obj) + "\n", (err) => {
                if (err) console.error(err); 
            });
        });
    }

    //from the training data we've collected, creates a fine-tuned model
    //@param   key   The API key for GPT-3. Need this for EVERYTHING here
    async uploadFileToFineTune(key) {

        //first, we check to see if we have a flie for the fine-tuning uploaded already
        let files_url = 'https://api.openai.com/v1/files';
        const files_header = {
            'Authorization': `Bearer ${key}`
        };

        let file_exists = false;
        let file_id = undefined;

        //if there already is a fine tuning made for the channel, we will need to delete the old one and replace it with
        //the new file we have made
        await fetch(files_url, {method: 'GET', headers: files_header}).then(result => result.json()).then(body => {
            let files_arr = body.data;
            files_arr.forEach(item => {
                let is_id_present = this.#data_base.searchForFineTuneID(item.id);
                if (is_id_present == true) { 
                    file_exists = true;
                    file_id = item.id;
                }
            });
        });
        
        //file does exist, so we edit the headers and the url, then delete the old file
        if (file_exists) {

            let deleted_properly = false;

            await fetch(files_url + `/${file_id}`, {method: 'DELETE',header: files_header})
            .then(result => result.json()).then(body => {
                if (body.id == file_id && body.deleted == true) {
                    deleted_properly = true;
                }
            });

            if (!deleted_properly) {
                console.log("ERROR: Failed to delete file for channel");
                return;
            }
        }

        //now, either because we deleted the old file or we never had a file for the channel, we now
        //upload a new file for the fine tuning to take place

        //since we are sending a file and not just a string like we would JSON, we make a FormData object to send
        //it with
        const data = new FormData();
        data.append('purpose', 'fine-tune');
        data.append('file', fs.createReadStream('./data/training.jsonl'));

        //rename when I dont want to throw my computer out working on this stuff
        const i_lost_the_will_to_live = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                ...data.getHeaders()
            },
            body: data
        };

        await fetch(files_url, i_lost_the_will_to_live).then(result => result.json())
        .then(body => this.#data_base.addFineTuningFileID(body.id, "pope_pontius"));

        console.log("* New Training File Uploaded to OpenAI");

    }

    //check to see if the fine tune job has completed
    async checkForFineTuneCompletion(key, channel, temp) {
        console.log(temp);
        //console.log(this.#finetune_id);
        const check_url = `https://api.openai.com/v1/fine-tunes/${temp}`;
        const check_header = {
            'method': 'GET',
            'Authorization': `Bearer ${key}`
        };
        let is_done = false;
        let model_id = '';
        await fetch(check_url, {method: 'GET', headers: check_header}).then(result => result.json()).then(body => {
            console.log(body);
            if (body.fine_tuned_model != null) {
                model_id = body.fine_tuned_model;
                console.log(model_id);
                is_done = !is_done;
            }
        }).catch(err => console.error(err));

        //if the job isnt done, we set a timer to check again in 10 mins or so
        if (!is_done) setTimeout(this.checkForFineTuneCompletion, 36000, key, channel, temp);
        //otherwise, we write the name of the model to the db
        else this.#data_base.addFineTuneModel(model_id, channel);
        
    }

    //creates a fine tuning job for OpenAI's API; said fine tuned model used in conjunction with !post2
    //@param   key       The API key for GPT-3. Need this for EVERYTHING here
    //@param   channel   The name of the channel we are creating the model for
    async createFineTuning(key, channel) {
        const finetune_url = 'https://api.openai.com/v1/fine-tunes';
        const finetune_header = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        };
        const finetune_body = {
            'training_file': await this.#data_base.getFineTuneFileID(channel),
            'model': 'davinci',
            'learning_rate_multiplier': 0.1,
            'suffix': channel
        };
        let err_found = false;
        let temp = '';
        await fetch(finetune_url, {method: 'POST', headers: finetune_header, body: JSON.stringify(finetune_body)})
            .then(result => result.json())
            .then(body => {
                console.log(body);
                temp = body.id;
                console.log(temp);
            })
            .catch(err => {
                console.error(err);
                err_found = !err_found;
            });
        this.#finetune_id = temp;
        //if we flunk out from getting the model made, we don't set up a timer for it
        if (!err_found) setTimeout(this.checkForFineTuneCompletion.bind(Trainer, key, channel, temp), 36000);
    }

    //gets the list of all fine tuned models with OpenAI and deletes them completely and cancells their fine tune jobs
    //@param   key   The OpenAI API key
    async findAndDeleteAllFineTunedModels(key) {

        //Step 1: We get the list of all fine tuned models via GET request
        let fine_tunes_url = 'https://api.openai.com/v1/fine-tunes';
        const fine_tune_headers = {
            'Authorization': `Bearer ${key}`
        };
        let fine_tune_model_list = [];
        let fine_tune_ids = [];
        await fetch(fine_tunes_url, {method: 'GET', headers: fine_tune_headers}).then(result => result.json())
        .then(body => {
            body.data.forEach(model => {
                fine_tune_model_list.push(model.fine_tuned_model);
                fine_tune_ids.push(model.id);
            });
        }).catch(err => {
            console.error(err);
            console.log('* Could not retrieve list of fine tuned models from OpenAI API');
            return;
        });


        //Step 2: Use list of model id's, we delete them one at a time via DELETE requests
        const delete_url = `https://api.openai.com/v1/models/`;

        for await (const model of fine_tune_model_list) {
            await fetch(delete_url + model, {method: 'DELETE', headers: fine_tune_headers})
            .then(result => result.json())
            .then(body => {
                if (body.error.type != undefined && body.error.type != 'invalid_request_error') {//seems like the list is kept even when deleted, so added check here
                    if (!body.deleted) console.log(`* Failed to delete model ${model} from OpenAI's API`);
                    else console.log(` Model ${model} has been deleted from OpenAI's servers`);
                }
            }).catch(err => {
                console.error(err);
                console.log('* Error in deleting models from OpenAI API');
                return;
            });
        }

        //Step 3: With the models removed, we cancel the fine tune jobs via a POST request
        for await (const ids of fine_tune_ids) {
            await fetch(`${fine_tunes_url}/${ids}/cancel`, {method: 'POST', headers: fine_tune_headers})
            .then(result => result.json())
            .then(body => {
                if (body.error != undefined) {
                    if (body.status == 'cancelled') console.log(`* Fine tune job ${ids} cancelled successfully`);
                }
            }).catch(err => {
                console.error(err);
                console.log('* Error in cancelling fine tune jobs');
            });
        }
    }

}

export default Trainer;