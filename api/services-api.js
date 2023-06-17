import supertest from 'supertest';

const request = supertest(process.env.SERVICES_API + 'v1/');

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

const apiParamsRequest = {
    Authorization: '2d3d736d0b4bb736d01af7f5ccc3b12d3b241b8eb6',
    AppToken: '692e44db271073fc:2d317a6d0a44b131d21dfef7cfc9b27a3d241487b2f656cc230d9e16c44bf0c9cec0c325c1af6191f658ff74976d046797474edeb88f7d0478e9a97ca94d34005e64d89c748df08765ca6fb0c6d2',
}

export {
    request,
    paramsRequest,
    apiParamsRequest
}