/**
 * Javascript for searchindex manager plugin
 *
 * @author Andreas Gohr <andi@splitbrain.org>
 * @author Symon Bent <hendrybadao@gmail.com>
 *     Rewrite using jQuery and revealing module pattern
 */

var plugin_nsindex = ( function() {

    // public methods/properties
    var pub = {};

    // private vars
    var pages = null,
        page =  null,
        url =  null,
        done =  1,
        count = 0,
        output = null,
        lang = null;
        ns = '';

    /**
     * initialize everything
     */
    pub.init = function(cur_ns) {
        output = $('plugin__searchbox');
        if( ! output) return;

        ns = cur_ns;
        url = DOKU_BASE + 'lib/plugins/searchbox/ajax.php';
        lang = LANG.plugins.searchbox;

        // init interface
        jQuery('.plugin__searchbox_update').click(update);
        jQuery('.plugin__searchbox_search').click(search);
    };

    /**
     * Gives textual feedback
     */
    var status = function(text) {
        output.innerHTML = text;
    };

    /**
     * Callback.
     * Executed when the index was cleared.
     * Starts the indexing
     */
    var cb_cleared = function() {
        var ok = this.response;
        if (ok == 1) {
            // start indexing
            window.setTimeout(pub.index,1000);
        } else {
            status(ok);
            // retry
            window.setTimeout(pub.clear,5000);
        }
    };

    /**
     * Callback.
     * Executed when the list of pages came back.
     * Starts the index clearing
     */
    var cb_pages = function() {
        var data = this.response;
        pages = data.split("\n");
        count = pages.length;
        status(lang.pages.replace(/%d/, pages.length));

        // move the first page from the queue
        page = pages.shift();

        // start index cleaning
        window.setTimeout(pub.clear,1000);
    };

    /**
     * Callback.
     * Returned after indexing one page
     * Calls the next index run.
     */
    var cb_index = function() {
        var ok = this.response;
        var wait = 500;
        if (ok == 1) {
            // next page from queue
            page = pages.shift();
            done++;
        } else {
            // something went wrong, show message
            status(ok);
            wait = 5000;
        }
        // next index run
        window.setTimeout(pub.index, wait);
    };

    /**
     * Starts the indexing of a page.
     */
    pub.index = function() {
        if (page) {
            status(lang.indexing + ' <b>' + page + '</b> (' + done + '/' + count + ')');
            jQuery.post(url, 'call=indexpage&page=' + encodeURI(page), cb_index);
        } else {
            // we're done
            throbber_off();
            status(lang.done);
        }
    };

    /**
     * Cleans the index
     */
    pub.clear = function() {
        status(lang.clearing);
        jQuery.post(url, 'call=clearindex', cb_cleared);
    };

    /**
     * Starts the whole index rebuild process
     */
    pub.go = function() {
        throbber_on();
        status(lang.finding);
        jQuery.post(url, 'call=pagelist&ns=' + encodeURI(ns), cb_pages);
    };

    /**
     * add a throbber image
     */
    var throbber_on = function() {
        output.style['background-image'] = "url('" + DOKU_BASE + 'lib/images/throbber.gif' + "')";
        output.style['background-repeat'] = 'no-repeat';
    };

    /**
     * Stop the throbber
     */
    var throbber_off = function() {
        output.style['background-image'] = 'none';
    };

    return pub;
})();

jQuery(function(){
    plugin_searchindex.init(JSINFO.namespace);
});