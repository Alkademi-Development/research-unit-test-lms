const getUserAccount = (argv) => {
    

    let user = {
        name: '',
        email: '',
        password: '',
        kind: null,
    };

    if(argv?.data != null || argv?.data?.length > 0) {
        const data = argv?.data?.split('=');
        const userAccount = data[1].split(';');
        const email = userAccount[0];
        const password = userAccount[1];
        
        user.email = email;
        user.password = password;
    } else {
        user.email = 'shivu@master.id';
        user.password = 'Terseraaah';
    }

    return user;
}

export {
    getUserAccount
}