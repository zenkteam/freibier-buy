const Tracker = {
    trackEvent: function (name: string, params: any) {
        const gtag = (window as any).gtag;
        if (gtag) {
            gtag(name, params);
        }
    }
}

export default Tracker;