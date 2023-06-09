import supertest from 'supertest';

const request = supertest(process.env.SERVICES_API + 'v1/');

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

const apiParamsRequest = {
    Authorization: '2d3d736d0b4bb036dd11fdf1cbc2b02f3b251a80bd',
    AppToken: '692e44db271073fc:2d317a6d014bbb38d71cfaf3ccc9b27a3d241487b2f656cc230d9e16c44bf0c9cbc0c325c6a96191ac5bff74973f046797464edee48c7d0478efa97ca94d34005b32d89c7489f08765ca6fb0c6d1',
}

export {
    request,
    paramsRequest,
    apiParamsRequest
}