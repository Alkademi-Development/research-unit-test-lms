import supertest from 'supertest';

const request = supertest(process.env.SERVICES_API + 'v1/');
const requestDriver = supertest(process.env.BASE_URL_DRIVE + 'v1/');

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

const apiParamsRequest = {
    Authorization: '2d3d736d0b4bb736d01af7f5ccc3b12d3b241b8eb6',
    AppToken: '692e44db271073fc:2d317a630049ba36dd11fbf6c6c9b27a3d241487b2f656cc230d9e16c14cf0c9cbc1c325c1f96191ac58ff749731046792444edee48b7d0478eba97ca91634005b3dd89c748ef08765996fb0c6d4',
}

export {
    request,
    requestDriver,
    paramsRequest,
    apiParamsRequest
}