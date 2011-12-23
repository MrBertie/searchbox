<?php
/**
 * AJAX call handler for nsindex plugin
 *
 * @license    GPL 2 (http://www.gnu.org/licenses/gpl.html)
 * @author     Andreas Gohr <andi@splitbrain.org>
 * @author     Symon Bent <hendrybadao@gmail.com>
 */

//fix for Opera XMLHttpRequests
if ( ! count($_POST) && $HTTP_RAW_POST_DATA) {
  parse_str($HTTP_RAW_POST_DATA, $_POST);
}

if ( ! defined('DOKU_INC')) define('DOKU_INC',realpath(dirname(__FILE__) . '/../../../') . '/');
if ( ! defined('DOKU_PLUGIN')) define('DOKU_PLUGIN',DOKU_INC . 'lib/plugins/');
require_once(DOKU_INC.'inc/init.php');
require_once(DOKU_INC.'inc/common.php');
require_once(DOKU_INC.'inc/pageutils.php');
require_once(DOKU_INC.'inc/auth.php');
require_once(DOKU_INC.'inc/search.php');
require_once(DOKU_INC.'inc/indexer.php');
require_once(DOKU_INC . 'inc/html.php');
require_once(DOKU_INC . 'inc/logger.php');
//close sesseion
session_write_close();

header('Content-Type: text/plain; charset=utf-8');

//we only work for admins!
if (auth_quickaclcheck($conf['start']) < AUTH_ADMIN) {
    die('access denied');
}

//call the requested function
$call = 'ajax_' . $_POST['call'];
if (function_exists($call)) {
    $call();
} else {
    print "The called function '" . htmlspecialchars($call). "' does not exist!";
}

/**
 * Searches a given query within the specified query
 */
function ajax_search() {

   if ( ! $_POST['query']) {
        print 1;
        exit;
    }

    _html_search($_POST['query'], $_POST['ns']);
}

/**
 * Lists all page names within a given namespace only
 *
 * @author Andreas Gohr <andi@splitbrain.org>
 * @author Symon Bent <hendrybadao@gmail.com>
 */
function ajax_pagelist() {
    global $conf;

   if ( ! $_POST['ns']) {
        print 1;
        exit;
    }
    $data = array();
    search($data, $conf['datadir'], 'search_allpages', array(), $_POST['ns']);

    foreach($data as $val) {
        print $val['id'] . "\n";
    }
}

/**
 * Clear all index files
 * NOTE: not used currently!
 */
function ajax_clearindex() {
    global $conf;
    // keep running
    @ignore_user_abort(true);

    // acquire a lock
    $lock = $conf['lockdir'].'/_indexer.lock';
    while(!@mkdir($lock)){
        if(time()-@filemtime($lock) > 60*5){
            // looks like a stale lock - remove it
            @rmdir($lock);
        }else{
            print 'indexer is locked.';
            exit;
        }
    }

    io_saveFile($conf['indexdir'].'/page.idx','');
    io_saveFile($conf['indexdir'].'/title.idx','');
    io_saveFile($conf['indexdir'].'/pageword.idx','');
    io_saveFile($conf['indexdir'].'/metadata.idx','');
    $dir = @opendir($conf['indexdir']);
    if($dir!==false){
        while(($f = readdir($dir)) !== false){
            if(substr($f,-4)=='.idx' &&
               (substr($f,0,1)=='i' || substr($f,0,1)=='w'
               || substr($f,-6)=='_w.idx' || substr($f,-6)=='_i.idx' || substr($f,-6)=='_p.idx'))
                @unlink($conf['indexdir']."/$f");
        }
    }
    @unlink($conf['indexdir'].'/lengths.idx');

    // we're finished
    @rmdir($lock);

    print 1;
}

/**
 * Index the given page
 */
function ajax_indexpage() {

    if ( ! $_POST['page']) {
        print 1;
        exit;
    }

    // keep running
    @ignore_user_abort(true);

    // no index lock checking, this is now done in idx_addPAge
    // this plugin requires at least Augua release anyway!

    // index the page only if it has changed
    $success = idx_addPage($_POST['page'], false, false);

    print ($success !== false) ? 1 : 0;
}

function _html_search($query, $ns) {
    global $lang;

    //do quick pagesearch
    $data = array();
    if ( ! empty($ns)) {
        $query = $query . ' @' . $ns;
    }

    ob_start();

    $data = ft_pageLookup($query, true, useHeading('navigation'));
    if (count($data)) {
        print '<div class="search_quickresult">';
        print '<h3>' . $lang['quickhits'] . ':</h3>';
        print '<ul class="search_quickhits">';
        foreach ($data as $id => $title) {
            print '<li> ';
            if (useHeading('navigation')) {
                $name = $title;
            } else {
                $ns = getNS($id);
                if ($ns) {
                    $name = shorten(noNS($id), ' (' . $ns . ')', 30);
                } else {
                    $name = $id;
                }
            }
            print html_wikilink(':' . $id, $name);
            print '</li> ';
        }
        print '</ul> ';
        //clear float (see http://www.complexspiral.com/publications/containing-floats/)
        print '<div class="clearer"></div>';
        print '</div>';
    }

    //do fulltext search
    $data = ft_pageSearch($query, $regex);
    if (count($data)) {
        $num = 1;
        foreach ($data as $id => $cnt) {
            print '<div class="search_result">';
            print html_wikilink(':' . $id, useHeading('navigation') ? null : $id, $regex);
            if ($cnt !== 0) {
                print ': <span class="search_cnt">'.$cnt.' '.$lang['hits'].'</span><br />';
                if ($num < FT_SNIPPET_NUMBER) { // create snippets for the first number of matches only
                    print '<div class="search_snippet">' . ft_snippet($id, $regex) . '</div>';
                }
                $num++;
            }
            print '</div>';
        }
    } else {
        print '<div class="nothing">'.$lang['nothingfound'].'</div>';
    }

    echo ob_get_clean();
}

