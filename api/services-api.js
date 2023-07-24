import { createCipheriv } from 'crypto';
import supertest from 'supertest';

const appSecret = process.env.APP_SECRET
const nodeENV = process.env.NODE_ENV

const request = supertest(process.env.SERVICES_API + 'v1/');
const requestDriver = supertest(process.env.BASE_URL_DRIVE + 'v1/');

var AppToken = '';

const generateAppToken = async () => {
    
    try {
        const res = await request.post('authorizer/token/generate')
            .set("Origin", 'dev.alkademi.id')
            .send({
                "id": "",
                "secret": "",
                "scopes": [
                    "alkademi"
                ]
            })

        const data = await res?.body?.data
        
        const token = generate(data?.code, data?.token)
        AppToken = `${data?.code}` + ':' + generate(data?.code, `${new Date().getTime()}:${generate(data?.code, data?.token)}`)
      } catch (err) {
        console.error(err);
    }
}
const generate = (code, token) => {
    const ci = createCipheriv(
      'aes-256-ctr',
      Buffer.from(appSecret),
      Buffer.from(code)
    )
  
    return ci.update(token, 'utf8', 'hex') + ci.final('hex')
}
await generateAppToken()

const apiParamsRequest = {
    Authorization: '2d3d736d0b4bb736d01af7f5ccc3b12d3b241b8eb6',
    AppToken,
    dAppToken: 'MjAyMy0wNy0wM1QyMzowMzowMi40NzJafGRldi5hbGthZGVtaS5pZHx2T1ZINnNkbXBOV2pSMjcxQ2M3cmR4czAxbHdIemZyMw=='
}

export {
    request,
    requestDriver,
    apiParamsRequest
}