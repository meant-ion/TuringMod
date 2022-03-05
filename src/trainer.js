//Holds the model trainer for OpenAI's API Fine Tuning
//How it works (General Outline): 
//  1. The bot records messages sent to the chatroom as normal, and sends it out to OpenAI via !post command call
//     However, unlike normal, the bot will not flush the prompt immediately.
//  2. OpenAI sends back a response and is evaluated by their content filter and by human eyes.
//     Posting the response will be the same as normal
//  3. The bot, through the Discord channel it's connected to, will listen for a !record command
//     If it is found, the bot will write down the prompt and its response inside of a JSONL file
import fs from 'fs';

export class Trainer {

    // The object that will hold the prompt and response from the channel
    // Format: {
    //          "channel_name": [
    //                          {
    //                              "prompt": (recorded prompt goes here)
    //                              "response": (ditto as above but with response)
    //                          },
    //          ]
    //         };
    #training_data;
    constructor() {
        this.#training_data = {};
    }

    //adds a prompt from a channel to the list of training data
    //@param   target   The channel we are recording the prompt from
    //@param   prompt   The prompt we sent out to OpenAI's GPT-3 API for a response
    addPromptToTrainingData(target, prompt) {
        let data_pt = {
            "prompt": prompt,
            "response": ""
        };
        this.#training_data[target] = [];
        this.#training_data[target].push(data_pt);
    }

    //records the response from GPT-3 to the channel and stores it into the correct object
    //@param   target   The channel we are recording the prompt from
    //@param   resp     The response from the channel that was sent out that we want to record
    recordResponse(target, resp) { this.#training_data[target]["response"] = resp; }

    //removes a channel from the list of training data sets. Usually done when a model has been made for that channel and
    //we no longer need to keep the data
    //@param   target   The channel we are recording the prompt from 
    deleteChannel(target) { delete this.#training_data[target]; }

    //writes the training data to a JSON Lines file (.jsonl) that will be sent out to OpenAI to make a model
    writeTrainingDataToFile(target) {
        //open up a write stream for easy file writing
        let write_stream = fs.createWriteStream("./data/training.jsonl", {flags: 'a'});

        //for each element in the channel's prompt/response array, make an object
        //and then pipe it into the file
        this.#training_data[target].forEach(item => {
            let obj = {
                "prompt": item.prompt,
                "completion": item.response
            };
            //let's hope that this will work correctly and not completely screw up here
            write_stream.pipe(JSON.stringify(obj) + "\n");
        });
    }

}

export default Trainer;