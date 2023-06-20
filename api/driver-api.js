import clc from 'cli-color';
import { requestDriver, apiParamsRequest } from './services-api.js';
import FormData from 'form-data';

const uploadFile = async (dataRequest) => {

    // Membuat objek FormData dan menambahkan file ke dalamnya
    const form = new FormData();
    form.append('file', dataRequest);

    try {
        const res = await requestDriver.post('upload')
          .set('content-type', `multipart/form-data; boundary=${form._boundary}`)
          .set('AppToken', apiParamsRequest.AppToken)
          .send(form);
    
        return res;
    } catch (err) {
        console.error(err);
        console.error(clc.red(clc.bold('Oops!, Something went wrong')));
        process.exit();
    }
}

export {
    uploadFile
}