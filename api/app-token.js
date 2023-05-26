import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const appHost = process?.env?.BASE_URL ? process.env.BASE_URL : 'http://192.168.18.170:4000/';

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

export {
    appHost,
    paramsRequest
}