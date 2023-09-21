const getUserAccount = (argv) => {
    

    // let user = {
    //     name: '',
    //     email: '',
    //     password: '',
    //     kind: null,
    // };

    // if(argv?.data != null && argv?.data != undefined) {
    //     const data = argv?.data?.split('=');
    //     const userAccount = data[1].split(';');
    //     const email = userAccount[0];
    //     const password = userAccount[1];
    //     const name = userAccount[2];
    //     const kind = parseInt(userAccount[3]);
        
    //     user.email = email;
    //     user.password = password;
    //     user.name = name;
    //     user.kind = kind;
    // } 

    let users = [];
    if(argv != null && argv?.data != null && argv?.data != undefined) {
        
        let data = argv?.data;

        // Mengapit value dengan tanda kutip tunggal
        data = data?.replace(/(?<=\[)[^[\]]+(?=\])/g, "'$&'");
        
        if(!data.includes("object")) {
            // Parsing string menjadi objek
            const parsedData = eval(`(${data})`);
            
            // Get data account
            users = parsedData?.accounts[0].split(',');
        }

    }

    return users;
}

export {
    getUserAccount
}