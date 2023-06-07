import supertest from 'supertest';

const request = supertest(process.env.SERVICES_API + 'v1/');

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

const apiParamsRequest = {
    Authorization: '2d3d736d0b4bb332d01bf9f4cec0b8263d241481bd',
    AppToken: '692e44db271073fc:2d317a6d024fb631d418fff1c6c9b27a3d241487b2f656cc230d9e16c44bf0c9cb9ac325c6ad6191f65fff74976d046797404edeb8df7d047feba97cf31134005e3dd89c718df08765ca6fb0c6d4',
}

export {
    request,
    paramsRequest,
    apiParamsRequest
}