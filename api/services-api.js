import supertest from 'supertest';

const request = supertest(process.env.SERVICES_API + 'v1/');

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

const apiParamsRequest = {
    Authorization: '2d3d736d0b4bb733d21cf7ffc7cab22f3c2f1781b5',
    AppToken: '692e44db271073fc:2d317a6d064eb435d11af6f2ccc9b27a3d241487b2f656cc230d9e16c44bf0c9cb9ec325c6ae6191f65dff74976b046797444edeb8df7d0478e8a97ca91734005e67d89c718ef08765cd6fb09cd6',
}

export {
    request,
    paramsRequest,
    apiParamsRequest
}