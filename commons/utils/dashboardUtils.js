import { By, Key, until } from 'selenium-webdriver';
import { captureConsoleErrors } from '#root/commons/utils/generalUtils';
import { captureAlertError } from '#root/commons/utils/generalUtils';

let errors;
const enterDashboard = async (driver, user, browser, appHost) => {

    // Aksi klik masuk untuk menuju ke halaman login/authentication
    if (!appHost.includes('192.')) {
        await driver.wait(until.elementLocated(By.css('#modal-center')));
        await driver.executeScript(`return document.querySelector('.modal-content button.close').click();`);
        await driver.executeScript(`return document.querySelector('ul li a.btn.btn-primary').click();`);
    }

    // Aksi Input Data Akun 
    await driver.wait(until.elementLocated(By.css(`.input-group.input-group-merge > input[type="email"]`)));
    await driver.findElement(By.css(`.input-group.input-group-merge > input[type="email"]`)).sendKeys(user.email, Key.RETURN);
    await driver.findElement(By.css(`.input-group.input-group-merge > input[type="password"]`)).sendKeys(user.password, Key.RETURN);
    await captureAlertError(driver);
    errors = await captureConsoleErrors(driver, browser);

    // Aksi menunggu element h1 tampil setelah melakukan authentikasi
    await driver.wait(until.elementsLocated(By.css(`h1.text-welcome`)));
    errors = await captureConsoleErrors(driver, browser);

    return errors;
}

export {
    enterDashboard
}