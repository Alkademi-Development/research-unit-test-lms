import supertest from 'supertest';

const request = supertest(process.env.SERVICES_API + 'v1/');
const requestDriver = supertest(process.env.BASE_URL_DRIVE + 'v1/');

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

const apiParamsRequest = {
    Authorization: '2d3d736d0b4bb736d01af7f5ccc3b12d3b241b8eb6',
    AppToken: '692e44db271073fc:2d317a6c014fb639d719fbf2cec9b27a3d241487b2f656cc230d9e16c44cf0c9cbc0c325c6ad6191f65fff74973e046797424edeb88e7d047feba97ca91534005b3dd89c748ef08765976fb09cd6',
}

export {
    request,
    requestDriver,
    paramsRequest,
    apiParamsRequest
}