import supertest from 'supertest';

const request = supertest(process.env.SERVICES_API + 'v1/');

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

const apiParamsRequest = {
    Authorization: '2b357562094cb438d21af8f5cec6b22e382e1480b1ae5ec1',
    AppToken: '692e44db271073fc:2d317a6d0749ba38d118f9fecdc9b27a3d241487b2f656cc230d9e16c44bf0c9cb9dc325c1f96191ac58ff74973e046797424edee48c7d047fbfa97ca91134005e63d89c748af08765cb6fb09cd6',
}

export {
    request,
    paramsRequest,
    apiParamsRequest
}