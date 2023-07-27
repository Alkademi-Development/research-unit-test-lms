import { By, Key, until } from 'selenium-webdriver';
import { captureConsoleErrors } from '#root/commons/utils/generalUtils';
import { captureAlertError } from '#root/commons/utils/generalUtils';
import { thrownAnError } from '#root/commons/utils/generalUtils';

let errors;
const enterDashboard = async (driver, user, browser, appHost) => {

    // Aksi menunggu modal content
    let modalContent = await driver.executeScript(`return document.querySelector('.modal-content') ? document.querySelector('.modal-content') : null`);
    if(await modalContent?.isDisplayed()) {
        await driver.wait(until.elementLocated(By.css('.modal-content')));              
        await driver.findElement(By.css(".modal-content header button.close")).click();
    }

    // Aksi Sleep
    await driver.sleep(5000);
    
    await driver.executeScript(`return document.querySelector('ul li a.btn.btn-primary').click();`);
    
    // Aksi Sleep
    await driver.sleep(5000);

    // Aksi Input Data Akun 
    let inputEmail = await driver.executeScript(`return document.querySelector('.input-group.input-group-merge > input[type="email"]') ? document.querySelector('.input-group.input-group-merge > input[type="email"]') : null`);
    if(await inputEmail?.isDisplayed()) {
        await driver.wait(until.elementLocated(By.css(`.input-group.input-group-merge > input[type="email"]`)));
        await driver.findElement(By.css(`.input-group.input-group-merge > input[type="email"]`)).sendKeys(user.email, Key.RETURN);
        await driver.findElement(By.css(`.input-group.input-group-merge > input[type="password"]`)).sendKeys(user.password, Key.RETURN);
        await captureAlertError(driver);
        errors = await captureConsoleErrors(driver, browser);
    } 
    await thrownAnError("There was no process fill the input field for enter the account data", !inputEmail.isDisplayed());
    
    // Aksi menunggu element h1 tampil setelah melakukan authentikasi
    await driver.wait(until.elementsLocated(By.css(`h1.text-welcome`)));
    errors = await captureConsoleErrors(driver, browser);

    return errors;
}

export {
    enterDashboard
}