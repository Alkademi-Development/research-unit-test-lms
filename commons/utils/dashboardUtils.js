import { By, Key, until } from 'selenium-webdriver';
import { captureConsoleErrors } from '#root/commons/utils/generalUtils';
import { captureAlertError } from '#root/commons/utils/generalUtils';

let errors;
const enterDashboard = async (driver, user, browser) => {

    // Aksi Input Data Akun
    await driver.wait(until.elementLocated(By.css(`.input-group.input-group-merge > input[type="email"]`)));
    await driver.findElement(By.css(`.input-group.input-group-merge > input[type="email"]`)).sendKeys(user.email, Key.RETURN);
    await driver.findElement(By.css(`.input-group.input-group-merge > input[type="password"]`)).sendKeys(user.password, Key.RETURN);
    errors = await captureConsoleErrors(driver, browser);
    await captureAlertError(driver);

    // Aksi menunggu element h1 tampil setelah melakukan authentikasi
    await driver.wait(until.elementsLocated(By.css(`h1.text-welcome`)));
    errors = await captureConsoleErrors(driver, browser);

    return errors;
}

export {
    enterDashboard
}