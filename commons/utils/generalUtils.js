import { By, Capabilities, logging } from "selenium-webdriver";

const parseToDomain = (url) => {

    // Membuat objek URL dari string URL
    const parsedUrl = new URL(url);

    // Mendapatkan domain utama tanpa subdomain
    const hostname = parsedUrl.hostname;
    const domain = hostname.startsWith('www.') ? parsedUrl.protocol + '//' + hostname.substring(4).split('.').slice(-2).join('.') : parsedUrl.protocol + '//' + hostname.split('.').slice(-2).join('.') + '/';


    return domain


}

async function captureConsoleErrors(driver, browser) {
    let errorMessages = [];
    if (browser?.toLowerCase() != 'firefox') {
        const logs = await driver.manage().logs().get(logging.Type.BROWSER);
        const errors = logs.filter(log => log.level.name != 'WARNING' && log.level.name === 'SEVERE' && !log.message.includes('export') && !log.message.includes('favicon.ico'));
        errorMessages = errors.map(error => error.message);
    }
    return errorMessages;
}

async function captureAlertError(driver, browser) {
    const alertWarning = await driver.executeScript(`return document.querySelector('.alert.alert-warning')`);
    if (alertWarning != null || alertWarning != undefined) {
        throw new Error(await alertWarning.getAttribute('innerText'));
    }
}

async function thrownAnError(message, condition) {
    if (condition) {
        throw new Error(message);
    }
}

export {
    parseToDomain,
    captureConsoleErrors,
    captureAlertError,
    thrownAnError
}