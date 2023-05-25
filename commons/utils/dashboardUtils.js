const enterDashbard = async (driver) => {

    await driver.findElement(By.css(`.input-group-merge >input[type="email"]`)).sendKeys(user.email, Key.RETURN);
    await driver.findElement(By.css(`.input-group-merge >input[type="password"]`)).sendKeys(user.password, Key.RETURN);
    await driver.wait(until.elementsLocated(By.css(`h1.text-welcome`)));
    
    return driver;
}

export {
    enterDashbard
}