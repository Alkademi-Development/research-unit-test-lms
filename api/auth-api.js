import clc from 'cli-color';
import { request, paramsRequest } from './services-api.js';
// import { paramsRequest } from './app-token.js';

const signIn = async (dataRequest) => {

    try {
        const res = await request.post('auth/signin')
          .set(paramsRequest.sApp, paramsRequest.sAppToken)
          .send(dataRequest);
    
        return res;
      } catch (err) {
        console.error(err);
        console.error(clc.red(clc.bold('Oops!, Something went wrong')));
        process.exit();
    }
}

export {
    signIn
}