import pkg from 'selenium-webdriver';
const { By, Capabilities, logging, Logs } = pkg;

const parseToDomain = (url) => {

    // Membuat objek URL dari string URL
    const parsedUrl = new URL(url);

    // Mendapatkan domain utama tanpa subdomain
    const hostname = parsedUrl.hostname;
    const domain = hostname.startsWith('www.') ? parsedUrl.protocol + '//' + hostname.substring(4).split('.').slice(-2).join('.') : parsedUrl.protocol + '//' + hostname.split('.').slice(-2).join('.') + '/';


    return domain


}

async function captureConsoleErrors(driver, browser) {
    if (browser?.toLowerCase() != 'firefox') {
        const logs = await driver.manage().logs().get('browser');
        let errors = logs.filter(log => log.level.name != 'WARNING' && log.level.name == 'SEVERE' && !log.message.includes('_nav') && !log.message.includes('favicon'));
        errors = errors.map(error => error.message);
        return errors
    }
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