/**
 * Javascript for searchindex manager plugin
 *
 * @author Andreas Gohr <andi@splitbrain.org>
 * @author Symon Bent <hendrybadao@gmail.com>
 *     Rewrite using jQuery and revealing module pattern
 */

var plugin_searchbox = ( function() {

    // public methods/properties
    var pub = {};

    // private vars
    var pages = null,
        page =  null,
        url =  null,
        done =  1,
        count = 0,
        output = null,
        ns = null,
        lang = null;

    /**
     * initialize everything
     */
    pub.init = function() {
        output = jQuery('#plugin__searchbox_msg');
        if( ! output) return;

        url = DOKU_BASE + 'lib/plugins/searchbox/ajax.php';
        lang = LANG.plugins.searchbox;
        ns = encodeURI(jQuery('#plugin__searchbox_ns').val());

        // init interface
        jQuery('#plugin__searchbox_update').click(pub.update);
        jQuery('#plugin__searchbox_clear').click(function() {
            jQuery('#plugin__searchbox_result').html("");
        });
        jQuery('#plugin__searchbox_btn').click(search);
        jQuery('#plugin__searchbox_qry').keyup(function(event) {
            if (event.keyCode == 13) {
                search();
            }
        });
    };

    var search = function() {
        var query = jQuery('#plugin__searchbox_qry').val();
        jQuery.post(url, 'call=search&query=' + encodeURI(query) + '&ns=' + ns, function(response) {
            jQuery('#plugin__searchbox_result').html(response);
        });
    };

    /**
     * Gives textual feedback
     */
    var status = function(text) {
        output.html('<p>' + text + '</p>');
    };

    /**
     * Starts the indexing of a page.
     */
    var index = function() {
        if (page) {
            jQuery.post(url, 'call=indexpage&page=' + encodeURI(page), function(response) {
                var wait = 250;
                var ignored = '';
                console.log(response);
                if (response == 0) {
                    // something went wrong, skip
                    ignored = '----' + lang.notindexed;
                }
                // next page from queue
                page = pages.shift();
                done++;

                status(lang.indexing + '(' + done + '/' + count + ') <b>' + page + '</b>' + ignored);
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
     * Cleans the index
     */
    var clear = function() {
        status(lang.clearing);
        jQuery.post(url, 'call=clearindex', function(response) {
            if (response != 1) {
                status(ok);
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
                status(lang.pages.replace(/%d/, pages.length));

                // move the first page from the queue
                page = pages.shift();

                if (rebuild === true) clear();

                // start indexing
                window.setTimeout(index,1000);
            } else {
                finished();
            }
        });
    };

    /**
     * add a throbber image
     */
    var throbber_on = function() {
        output
            .css('background-image', "url('" + DOKU_BASE + 'lib/images/throbber.gif' + "')")
            .css('background-repeat', 'no-repeat')
            .css('background-position', '5px 4px')
            .css({'border-width': '1px', 'padding': '3px'});
    };

    /**
     * Stop the throbber
     */
    var throbber_off = function() {
        output
            .css('background-image', 'none')
            .css({'border-width': '0px', 'padding': '0px'});
    };

    // return only public methods/properties
    return pub;
})();

jQuery(function() {
    plugin_searchbox.init();
});