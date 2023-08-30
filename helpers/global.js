import { By, until } from "selenium-webdriver";
import Imap from "node-imap"

async function removeModal(driver) {
    
    let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
    if(await modalContent?.isDisplayed()) {
        await driver.wait(until.elementLocated(By.css('.modal-content')));              
        await driver.findElement(By.css(".modal-content header button.close")).click();
    }

}
        
async function getAppTokenGoogle(email, pass, status = ["Unseen"], customRegex) {
  return new Promise(async (resolve, reject) => {
    var imap = new Imap({
        user: email,
        password: pass,
        host: 'imap.gmail.com',
        port: 993,
        tls: true
    });
    
    imap.connect();

    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err, mailbox) => {
        if (err) {
          console.error("Error opening mailbox:", err);
          imap.end();
          reject(err);
          return;
        }

        const searchCriteria = status;
        const fetchOptions = { bodies: ["TEXT"], markSeen: false };

        const fetch = imap.search(searchCriteria, (err, results) => {
          if (err) {
            console.error("Error searching for emails:", err);
            imap.end();
            reject(err);
            return;
          }

          const messageCount = results.length;

          if (messageCount === 0) {
            console.log("No new messages.");
            imap.end();
            reject("No new messages");
            return;
          }

          let messagesProcessed = 0;
          const values = [];

          results.forEach(messageNumber => {
            const f = imap.fetch(messageNumber, fetchOptions);

            f.on("message", (msg) => {
              let body = "";

              msg.on("body", (stream) => {
                stream.on("data", chunk => {
                  body += chunk.toString("utf8");
                });

                stream.on("end", () => {
                  const match = body.match(customRegex);
                  
                  if (match) {
                    values.push(match);
                  }

                  messagesProcessed++;

                  if (messagesProcessed === messageCount) {
                    imap.end();
                    if (values) {
                      resolve(match);
                    } else {
                      reject("Content value wasn't found");
                    }
                  }
                });
              });
            });

            f.once("error", err => {
              console.error("Error fetching message:", err);
              messagesProcessed++;

              if (messagesProcessed === messageCount) {
                imap.end();
                reject(err);
              }
            });
          });
        });
      });
    });
    
    imap.once("error", err => {
      console.error("IMAP connection error:", err);
      reject(err);
    });
  });
}

export { removeModal, getAppTokenGoogle };