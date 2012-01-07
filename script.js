/**
 * Javascript for searchindex manager plugin
 *
 * @author Andreas Gohr <andi@splitbrain.org>
 * @author Symon Bent <hendrybadao@gmail.com>
 *     Rewrite using jQuery and revealing module pattern
 */

var plugin_searchbox = (function() {

    // public methods/properties
    var pub = {};

    // private vars
    var pages = null,
        page =  null,
        url =  null,
        done =  1,
        count = 0,
        $msg = null,
        $query = null,
        ns = null,
        lang = null;

    /**
     * initialize everything
     */
    pub.init = function() {
        $msg = jQuery('#plugin__searchbox_msg');
        if( ! $msg) return;

        lang = LANG.plugins.searchbox;
        url = DOKU_BASE + 'lib/plugins/searchbox/ajax.php';
        // can't use the JSINFO ns; this is a user-config'ed value'
        ns = encodeURI(jQuery('#plugin__searchbox_ns').val());

        $result = jQuery('#plugin__searchbox_result');

        // if this was a page reload due to clicking a result link then refresh search result
        var result = sessionStorage.getItem('result');
        if (result !== undefined) {
            $result.html(result);
            sessionStorage.clear();
        }

        // reindexing interface
        jQuery('#plugin__searchbox_update').click(pub.update);
        jQuery('#plugin__searchbox_rebuild').click(pub.rebuild);

        // searching interface
        jQuery('#plugin__searchbox_clear').click(function() {
            $result.removeClass('showresult').html("");
        });
        jQuery('#plugin__searchbox_btn').click(search);
        $query = jQuery('#plugin__searchbox_qry');
        $query.keyup(function(event) {
            // allow for enter key when searching
            if (event.keyCode == 13) {
                search();
            }
        });
        // save the current search results ready for page reload
        $result.delegate('a', 'click', function() {
            sessionStorage.setItem('result', $result.html());
        });
    };

    var search = function() {
        throbber_on();
        status(lang.searching);
        jQuery.post(url, 'call=search&query=' + encodeURI($query.val()) + '&ns=' + ns, function(response) {
            status('');
            throbber_off();
            $result.addClass('showresult').html(response);
        });
    };

    /**
     * Gives textual feedback
     */
    var status = function(text) {
        if (text.charAt(0) !== '<') {
            text = '<p>' + text + '</p>'
        }
        $msg.html(text);
    };

    /**
     * Starts the indexing of a page.
     */
    var index = function() {
        if (page) {
            jQuery.post(url, 'call=indexpage&page=' + encodeURI(page), function(response) {
                var wait = 250;
                var skipped = '';
                if (response == 0) {
                    // either already indexed or something went wrong: skip
                    skipped = '<p class="status">' + lang.notindexed + '</p>';
                }
                // next page from queue
                page = pages.shift();
                done++;

                status('<p>' + lang.indexing + ' ' + done + '/' + count + '</p><p class="name">' + page + '</p>' + skipped);
                // next index run
                window.setTimeout(index, wait);
            });
        } else {
            finished();
        }
    };

    var finished = function() {
        // we're done
        throbber_off();
        status(lang.done);
        window.setTimeout(function() {
            status('');
        }, 3000);
    };
    /**
     * Cleans the index (ready for complete rebuild)
     */
    var clear = function() {
        status(lang.clearing);
        jQuery.post(url, 'call=clearindex', function(response) {
            if (response !== 1) {
                status(response);
                // retry
                window.setTimeout(clear,5000);
            }
        });
    };

    pub.rebuild = function() {
        pub.update(true);
    };
    /**
     * Starts the index update
     */
    pub.update = function(rebuild) {
        rebuild = rebuild || false;
        throbber_on();
        status(lang.finding);
        jQuery.post(url, 'call=pagelist&ns=' + ns, function(response) {
            if (response != 1) {
                pages = response.split("\n");
                count = pages.length;
                status(lang.pages.replace(/%d/, count));
                debugger;
                // move the first page from the queue
                page = pages.shift();

                // complete index rebuild?
                if (rebuild === true) clear();

                // start indexing
                window.setTimeout(index, 1000);
            } else {
                finished();
            }
        });
    };

    /**
     * add a throbber image
     */
    var throbber_on = function() {
        $msg.addClass('updating');
    };

    /**
     * Stop the throbber
     */
    var throbber_off = function() {
        $msg.removeClass('updating');
    };

    // return only public methods/properties
    return pub;
})();

jQuery(function() {
    plugin_searchbox.init();
});