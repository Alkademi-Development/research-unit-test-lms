const getUserAccount = (argv) => {
    

    let user = {
        name: '',
        email: '',
        password: '',
        kind: null,
    };

    if(argv?.data != null && argv?.data != undefined) {
        const data = argv?.data?.split('=');
        const userAccount = data[1].split(';');
        const email = userAccount[0];
        const password = userAccount[1];
        
        user.email = email;
        user.password = password;
    } 

    return user;
}

export {
    getUserAccount
}