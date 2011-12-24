<?php
if(!defined('DOKU_INC')) define('DOKU_INC',realpath(dirname(__FILE__) . '/../../') . '/');
if(!defined('DOKU_PLUGIN')) define('DOKU_PLUGIN', DOKU_INC . 'lib/plugins/');
require_once(DOKU_PLUGIN . 'syntax.php');

class syntax_plugin_searchbox extends DokuWiki_Syntax_Plugin {

    function getType(){
        return 'substition';
    }

    function getSort(){
        return 105;
    }

    function connectTo($mode) {
        $this->Lexer->addSpecialPattern('{{searchbox.*?}}', $mode, 'plugin_searchbox');
    }

    function handle($match, $state, $pos, &$handler) {
        global $INFO, $lang;

        $opt = array();

        // default options
        $opt['ns'] = $INFO['namespace'];       // this namespace (default)
        $opt['button'] = $lang['btn_search'];  // button display name (default = Dokuwiki's)

		$match = substr($match, 12, -2);

        $args = explode(';', $match);
        foreach ($args as $arg) {
            list($key, $value) = explode('=', $arg);
            switch ($key) {
                case 'button':
                    $opt['button'] = $value;
                case 'ns':
                    $opt['ns'] = resolve_id($opt['ns'], $value);
                    break;
            }
        }
		return $opt;
    }

	function render($mode, &$renderer, $opt) {

		$renderer->info['cache'] = false;
        $placeholder = sprintf($this->getLang('placeholder'), $opt['ns']);

		if ($mode == 'xhtml') {
		    $renderer->doc .=
                '<div class="searchbox" id="plugin__searchbox">' .
                    '<div class="search">' .
                        '<div class="reindex">' .
                            '<a class="rebuild" id="plugin__searchbox_rebuild" title="' . $this->getLang('rebuild_tip') . '">'
                            . $this->getLang('rebuild') . '</a>' .
                            '<a class="update" id="plugin__searchbox_update" title="' . $this->getLang('update_tip') . '">'
                            . $this->getLang('update') . '</a>' .
                        '</div>' .
                        '<input id="plugin__searchbox_qry" class="query" type="text"  maxlength="255 "' .
                        'tabindex="2" placeholder="' . $placeholder . '"/>' .
                        '<input id="plugin__searchbox_btn" class="button" type="button" tabindex="3" ' .
                        'value="' . $opt['button'] . '"/>' .
                        '<a class="clear" id="plugin__searchbox_clear">' . $this->getLang('clear') . '</a>' .
                    '</div>' .
                    '<div class="msg" id="plugin__searchbox_msg"></div>' .
                    '<div class="result" id="plugin__searchbox_result"></div>' .
                    '<input id="plugin__searchbox_ns" type="hidden" value="' . $opt['ns'] . '"/>' .
                '</div>';
			return true;
		}
		return false;
	}
}