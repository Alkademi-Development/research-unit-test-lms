const parseToDomain = (url) => {

    // Membuat objek URL dari string URL
    const parsedUrl = new URL(url);
    
    // Mendapatkan domain utama tanpa subdomain
    const hostname = parsedUrl.hostname;
    const domain = hostname.startsWith('www.') ? parsedUrl.protocol + hostname.substring(4).split('.').slice(-2).join('.') : parsedUrl.protocol + hostname.split('.').slice(-2).join('.');
    
    
    return domain
    

}

export {
    parseToDomain
}