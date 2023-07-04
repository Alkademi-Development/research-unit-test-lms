import supertest from 'supertest';

const request = supertest(process.env.SERVICES_API + 'v1/');
const requestDriver = supertest(process.env.BASE_URL_DRIVE + 'v1/');

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

const apiParamsRequest = {
    Authorization: '2d3d736d0b4bb736d01af7f5ccc3b12d3b241b8eb6',
    AppToken: '692e44db271073fc:2d317a63074ebb31d11af6f6ccc9b27a3d241487b2f656cc230d9e16c14cf0c9cb9dc325c6ae6191ac5bff74976e046797404edee48b7d0478e9a97ca94c34005e64d89c748bf08765cd6fb0c6d5',
    dAppToken: 'MjAyMy0wNy0wM1QyMzowMzowMi40NzJafGRldi5hbGthZGVtaS5pZHx2T1ZINnNkbXBOV2pSMjcxQ2M3cmR4czAxbHdIemZyMw=='
}

export {
    request,
    requestDriver,
    paramsRequest,
    apiParamsRequest
}