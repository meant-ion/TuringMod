//file to hold our helper functions so that we can use them across files in the project

import {URL as url} from 'url';
import { exec } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { appendFile } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class Helper {

    #dir_separator;

    constructor() {
        this.#dir_separator = "\/\/\/\/";
    }
                    
    /**
     * combines the input into a single string
     * @param {string} input_msg The message that needs to be combined into one string
     * @param {boolean} need_white_space Whether the string needs to have spaces between words
     * @returns {string} A string made up of all elements of the inputMsg array
     */
    combineInput(input_msg, need_white_space) {
        let combined_msg = '';
        for (let i = 0; i < input_msg.length; ++i) {
            if (i != 0) combined_msg += input_msg[i];
            if (need_white_space && (i + 1 != input_msg.length)) combined_msg += ' ';
        }
        return combined_msg;
    }
         
    /**
     * function to get the time passed from one point to another
     * @param {Date} start_time The time and date we are calculating time passed from
     * @param {boolean} need_day Tell if we need the number of days passed since the start
     * @returns {string} A message telling how much time has passed since the starting date to the current date
     */
    getTimePassed(start_time, need_day) {

        const cur_time = new Date();
        const difference = (cur_time.getTime() - start_time.getTime()) / 1000;
        const unfloored_hours = difference / 3600;
        const floored_hours = Math.floor(unfloored_hours);
        const days = Math.floor(floored_hours / 24);
        const mins = Math.round((unfloored_hours - floored_hours) * 60);
        const secs = Math.round((unfloored_hours - floored_hours) * 3600);
        const months = Math.floor(days / 30);
        const years = Math.floor(months / 12);
        let date_str = `${floored_hours % 24} hours ${mins % 60} minutes ${secs % 60} seconds`;
        if (!need_day) return date_str;
        if (days > 0) date_str = `${days % 30} days ` + date_str;
        if (months > 0) date_str = `${months % 12} months ` + date_str;
        if (years > 0) date_str = `${years} years ` + date_str ;
        return date_str;
    }
              
    /**
     * simple helper to see if the user is the channel owner (streamer) or a moderator of the channel
     * @param {string} user username 
     * @param {*} the_streamer channel owner username
     * @returns {boolean} True or false, depending on if the user is a mod or the streamer
     */
    checkIfModOrStreamer(user, the_streamer) { return user.mod || ('#' + user.username == the_streamer); }
                 
    /**
     * helper function that tells us only if the user is the streamer or not
     * @param {string} username
     * @param {string} the_streamer The name of the channel owner
     * @returns {boolean} True or false, depending on if the user is the streamer
     */
    isStreamer(username, the_streamer) { return username == the_streamer; }
           
    /**
     * checks the whole of a message to tell if there is a URL present. If so, it will return the url
     * @param {string} input_msg The message that is being read through to detect symbol spam
     * @returns {string} The URL, or an empty string if not valid
     */
    checkIfURL(input_msg) {
        //do not have this be a forEach loop, it will not work lol
        for (let i = 0; i < input_msg.length; ++i) 
            try {
                new url(input_msg[i]);
                return input_msg[i];
            } catch (err) { }
        
        return "";
    }
              
    /**
     * Tells if the message sent by the user is @-ing the streamer
     * @param {string} input_msg The whole message sent by the user
     * @returns {boolean} T/F if the streamer is @'ed in the message
     */
    isStreamerMentioned(input_msg) {
        input_msg = input_msg.map(item => item.toLowerCase());
        return input_msg.includes('@pope_pontius');
    }

    /**
     * gets the current time in Central Standard Time in AM/PM configuration
     * @returns {string} the current time as a human-readable message
     */
    getCurrentTime() {
        const cur_time = new Date();
        let is_AM = false;

        //get the hours in military configuration
        const military_hours = cur_time.getHours();

        let true_hours = 0;

        //figure out what the military time converts to in standard configuration
        if (military_hours > 0 && military_hours < 12) {
            true_hours = military_hours;
            is_AM = true;
        } else if (military_hours == 12) {
            true_hours = military_hours;
            is_AM = false;
        } else if (military_hours > 12) {
            true_hours = military_hours - 12;
            is_AM = false;
        } else if (military_hours == 0) {
            true_hours = 12;
            is_AM = true;
        }

        let cur_mins = cur_time.getMinutes();
        if (cur_mins < 10) cur_mins = String("0" + cur_mins);

        //calculate the minutes, craft the message, and then send to chat
        return `${true_hours}:${cur_mins} ${is_AM ? "A.M." : "P.M."}`;
    }

    /**
     * @returns {string} mm/dd/yyyy formatted date string
     */
    getCurrentDate() {
        const cur_date = new Date();
        const day = String(cur_date.getDate()).padStart(2, '0');
        const month = String(cur_date.getMonth() + 1).padStart(2, '0');
        const year = cur_date.getFullYear();
        return month + '/' + day + '/' + year;
    }

    /**
     * @param {Number} num the number we wish to round
     * @param {boolean} is_percentage tell us if we are rounding a percentage or not
     * @returns {number} num rounded to two decimals
     */
    roundToTwoDecimals(num, is_percentage) {
        let neg = false;
        if (num < 0 && is_percentage) {
            neg = true;
            num *= -1;
        }
        const multiplier = Math.pow(10,2);
        num = parseFloat((num * multiplier).toFixed(11));
        num = (Math.round(num) / multiplier).toFixed(2);
        if (neg) num = (num * -1).toFixed(2);
        return num;
    }
       
    /**
     * converts a JSON list of key-value pairs into an array of values
     * @param {object} obj The JSON object to be processed
     * @returns {Array} An array of values from the JSON object
     */
    getGitStatsArray(obj) {
        const keys = Object.keys(obj);
        const r = [];
        keys.forEach(item => r.push(obj[item]));
        return r;
    }

    /**
     * @param {boolean} run chooses what program must be ran
     * @returns {string} CLI command to determine OS
     */
    detect_platform(run) {
        let cmd = '';
        switch (process.platform) {
            case 'win32': cmd = (run) ? `tasklist` : `start `; this.#dir_separator = "\\\\"; break;
            case 'darwin': cmd = (run) ? `ps -ax | grep ${query}` : `open `; break;
            case 'linux': cmd = (run) ? `ps -A` : `xdg-open `; break;
            default: break;
        }
        return cmd;
    }

    /**
     * @param {string} query what program to detect
     * @param {Function} cb callback function to run after detection
     */
    async is_running(query, cb) {
        let cmd = this.detect_platform(true);
        exec(cmd, (err, stdout, stderr) => {
            cb(stdout.toLowerCase().indexOf(query.toLowerCase()) > -1);
        });
    }

    /**
     * @param {string} program name of program to open
     */
    async open_program(program) {
        const dot_count = (resolve(__dirname).match(new RegExp(this.#dir_separator, "g")) || []).length;
        const slash_count = dot_count - 1;

        let exec_str = "c: && cd ";
        for (let i = 0; i < dot_count; ++i) {
            exec_str += "..";
            if (i < slash_count) exec_str += "/";
        }

        exec_str += (program.toLowerCase() == 'firefox.exe') ? " && cd Program Files && cd Mozilla Firefox && firefox.exe"
            : " && cd Program Files && cd VideoLAN && cd VLC && vlc.exe";

        exec(exec_str);
    }

    /**
     * @param {string} input what to write to file
     * @param {string} filename where to write the input to
     * @param {boolean} need_combination whether inputs need to be combined before writing
     */
    writeToFile(input, filename, need_combination) {
        appendFile(filename, (need_combination ? this.combineInput(input, true) : input) + '\n', (err) => {
            if (err) { console.error(err); }
        });
    }

    /**
     * @param {Number} ms time to sleep program in milliseconds 
     * @returns {Promise} 
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default Helper;