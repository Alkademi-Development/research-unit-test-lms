import supertest from 'supertest';

const request = supertest(process.env.SERVICES_API + 'v1/');

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

const apiParamsRequest = {
    Authorization: '2d3d736d0b4bb736d01af7f5ccc3b12d3b241b8eb6',
    AppToken: '692e44db271073fc:2d317a6c0249ba33dd1af7ffcfc9b27a3d241487b2f656cc230d9e16c44cf0c9cb9ac325c1f96191ac58ff74976b046792444edee48a7d047fbfa97cf31134005e61d89c718df08765966fb0c68f',
}

export {
    request,
    paramsRequest,
    apiParamsRequest
}