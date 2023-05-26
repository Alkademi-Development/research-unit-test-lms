import supertest from 'supertest';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

const request = supertest(process.env.SERVICES_API + 'v1/');

export {
    request,
    paramsRequest
}