import { By, Key, until } from 'selenium-webdriver';

const enterDashboard = async (driver, user) => {

    await driver.findElement(By.css(`.input-group.input-group-merge >input[type="email"]`)).sendKeys(user.email, Key.RETURN);
    await driver.findElement(By.css(`.input-group.input-group-merge >input[type="password"]`)).sendKeys(user.password, Key.RETURN);
    await driver.wait(until.elementsLocated(By.css(`h1.text-welcome`)), 5000);
    
}

export {
    enterDashboard
}