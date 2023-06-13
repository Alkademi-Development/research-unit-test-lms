import supertest from 'supertest';

const request = supertest(process.env.SERVICES_API + 'v1/');

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

const apiParamsRequest = {
    Authorization: '2d3d736d0b4bb736d01af7f5ccc3b12d3b241b8eb6',
    AppToken: '692e44db271073fc:2d317a6d054cb733d31bfef4cec9b27a3d241487b2f656cc230d9e16c44bf0c9cb9bc325c6a86191f65eff74976b046797464edeb8dc7d0478eba97ca91034005e67d89c7488f08765996fb0c68f',
}

export {
    request,
    paramsRequest,
    apiParamsRequest
}