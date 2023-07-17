import { By, until } from "selenium-webdriver";

async function removeModal(driver) {
    
    let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
    if(await modalContent?.isDisplayed()) {
        await driver.wait(until.elementLocated(By.css('.modal-content')));              
        await driver.findElement(By.css(".modal-content header button.close")).click();
    }

}

export { removeModal };