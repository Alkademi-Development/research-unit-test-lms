import supertest from 'supertest';

const request = supertest(process.env.SERVICES_API + 'v1/');
const requestDriver = supertest(process.env.BASE_URL_DRIVE + 'v1/');

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

const apiParamsRequest = {
    Authorization: '2d3d736d0b4bb736d01af7f5ccc3b12d3b241b8eb6',
    AppToken: 'cf370172bd44e296:cb962f68003c2a0821e841988bea44711bffbca27646ad780c0bd3e9f17c4a5fadf799865c1a4067796eed1759bc251df65d9a597e14ac755a9c42312cf1a249dfaff8d96ee3268bd0bc630eddfc',
    dAppToken: 'MjAyMy0wNy0wM1QyMzowMzowMi40NzJafGRldi5hbGthZGVtaS5pZHx2T1ZINnNkbXBOV2pSMjcxQ2M3cmR4czAxbHdIemZyMw=='
}

export {
    request,
    requestDriver,
    paramsRequest,
    apiParamsRequest
}