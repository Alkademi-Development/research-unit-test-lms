import supertest from 'supertest';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const request = supertest(process.env.SERVICES_API + 'v1/');

export {
    request,
}