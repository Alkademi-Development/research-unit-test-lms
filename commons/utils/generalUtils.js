import { logging } from "selenium-webdriver";

const parseToDomain = (url) => {

    // Membuat objek URL dari string URL
    const parsedUrl = new URL(url);
    
    // Mendapatkan domain utama tanpa subdomain
    const hostname = parsedUrl.hostname;
    const domain = hostname.startsWith('www.') ? parsedUrl.protocol + '//' + hostname.substring(4).split('.').slice(-2).join('.') : parsedUrl.protocol + '//' + hostname.split('.').slice(-2).join('.') + '/';
    
    
    return domain
    

}

async function captureConsoleErrors(driver) {
    let error = null;
    const logs = await driver.manage().logs().get(logging.Type.BROWSER);
    const errors = logs.filter(log => log.level.name != 'WARNING' && log.level.name === 'SEVERE' && !log.message.includes('export'));
    const errorMessages = errors.map(error => error.message);
    if(errorMessages.length > 0) {
        error = new Error(errorMessages);
    }

    return { driver, error };
}

export {
    parseToDomain,
    captureConsoleErrors
}