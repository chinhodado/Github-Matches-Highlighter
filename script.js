// ==UserScript==
// @name         Github Matches Highlighter
// @version      0.3
// @description  Highlight all matches of the clicked on word in the Github code viewer
// @include      https://github.com/*
// @copyright    2014, Chin
// @run-at       document-end
// @grant        none
// ==/UserScript==

// This script uses jQuery, but does not include it, since Github already uses it

var cfg = {};
var fns = {};

/**
 * Add a css style element to <head>
 */
function addGlobalStyle(css) {
    var head = document.getElementsByTagName('head')[0];
    if (!head) {
        return;
    }
    var style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
}

/**
 * Highlight all matches of the clicked on word
 */
function highlightMatch() {
    var codeContent = document.getElementsByClassName('highlight js-file-line-container')[0];

    // revert all highlighted text back to their previous state
    var highlighted = codeContent.getElementsByClassName('match_highlighted');
    while (highlighted.length !== 0) {
        var span = highlighted[0];
        span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
    }

    // Gets clicked on word
    var t = '';

    // Webkit, Gecko
    var s = window.getSelection();
    if (s.isCollapsed) { // don't care when the user highlight text manually
        s.modify('move', 'forward', 'character');
        s.modify('move', 'backward', 'word');
        s.modify('extend', 'forward', 'word');
        t = s.toString();
        t = t.replace(/[^\w\s]/gi, '').trim();
        s.modify('move', 'forward', 'character'); //clear selection

        var n, allTextNodes = [],
            walk = document.createTreeWalker(codeContent, NodeFilter.SHOW_TEXT, null, false);
        while (n = walk.nextNode()) {
            allTextNodes.push(n);
        }

        for (var i = 0; i < allTextNodes.length; i++) {
            n = allTextNodes[i];
            var replaceNodes = processTextNode(n, t);
            var parentNode = n.parentNode;
            parentNode.replaceChild(replaceNodes[replaceNodes.length - 1], n);
            var referenceElement = replaceNodes[replaceNodes.length - 1];
            for (var k = 0; k < replaceNodes.length - 1; k++) {
                parentNode.insertBefore(replaceNodes[k], referenceElement);
            }
        }

        // normalize the document, i.e. merging adjacent text nodes
        codeContent.normalize();

        // clear the current markers on the indicator
        fns.codenav_clear_marks();

        // add a marker for each highlighted span
        highlighted = $('.match_highlighted');
        for (i = 0; i < highlighted.length; i++) {
            var tok = highlighted[i];

            // grab the line number
            var lineno = parseInt($(tok).closest('td').attr('id').slice(2));
            fns.codenav_mark_line(lineno, tok);
        }

        // log the clicked on word for debugging purpose
        console.log("\"" + t + "\"");
    }
}

/**
 * Given a textNode and a string toFind, returns an array of text nodes/spans such that each occurance
 * of the toFind in textNode's text is turned into a ".match_highlighted" span
 */
function processTextNode(textNode, toFind) {
    var text = textNode.textContent;
    var nodes = [];
    var indexLeft = text.indexOf(toFind);
    if (indexLeft != -1) {
        if (indexLeft > 0) {
            // process left node. We can be sure that there's no occurance of toFind in leftText, so just push it in as-is
            var leftText = text.substring(0, indexLeft);
            nodes.push(document.createTextNode(leftText));
        }

        var span = document.createElement('span');
        span.innerHTML = toFind;
        span.className = "match_highlighted";
        nodes.push(span);

        if (indexLeft + toFind.length < text.length) {
            // todo: process the right part properly
            var rightText = text.substring(indexLeft + toFind.length);
            nodes.push(document.createTextNode(rightText));
        }
    } else {
        nodes.push(textNode);
    }

    return nodes;
}

/**
 * Try to find the code viewer and bind the onClick event to it.
 * Also setup the indicator bar.
 */
function trySetup() {
    var codeContent = document.getElementsByClassName('highlight js-file-line-container')[0];
    if (codeContent) {
        if (!codeContent.onclick) {
            codeContent.onclick = highlightMatch;
            console.log("onClick registered");

            setup_config();
            setup_scroll_bar();
            setup_scroll_bar_positioning();

            setTimeout(function() {
                $(window).trigger('scroll.codenav');
            }, 100);

            console.log("Setup done");
        }
    } else {
        // console.log("Code viewer not found");
    }
}

/**
 * Add the necessary css rules
 */
function setupCss() {
    addGlobalStyle('.match_highlighted { background-color: rgba(253, 255, 0, 0.28); }');
    addGlobalStyle('.codenav_scroll_indicator { width: 10px; vertical-align: top; text-align: right; line-height: 1; float: right; \
                   margin-top: 3px; margin-bottom: 3px; top: 45px; right: 12px; position: absolute; z-index: 999999; }');
    addGlobalStyle('.codenav_scroll_indicator_mark { position: absolute; background-color: #ffa; border: 1px solid #909090; \
      width: 10px; height: 8px; float: right; cursor: pointer;}');
}

function setup_config() {
    cfg.original_scroll_pos = $(window).scrollTop();
    cfg.$code_body = $('.js-file-line-container');

    var font_size = cfg.$code_body.css('font-size');
    cfg.line_height = font_size ? Math.floor(parseInt(font_size.replace('px', '')) * 1.5) : 19;
}

function setup_scroll_bar() {
    // Manual width is to fix firefox problem.
    var $scrollindicator = $('<div class="codenav_scroll_indicator"></div>')
        .appendTo($('.js-file-line-container').parent());
    var $bwrapper = $('.blob-wrapper');
    var total_num_lines = $('.js-line-number').length; // total lines in file
    var did_set_border = false;

    // Define marking functions.
    fns.codenav_mark_line = function(n, $elt) {
        // Reset height to handle resize
        var $bwrapper = $('.blob-wrapper');
        $scrollindicator.height(Math.min($(window).innerHeight(), $bwrapper.height()));

        if (!did_set_border) {
            $bwrapper.css('border-right', '14px solid rgba(0, 0, 0, 0.04)');
            did_set_border = true;
        }

        // Compute marker position
        var height;
        if ($('body').height() > $(window).height()) {
            // Has scroll bar.
            height = Math.round((n / total_num_lines) * 100) + '%';
        } else {
            // Handle the special case where the document fits within the entire window.
            height = (cfg.line_height * n - 20) + 'px';
        }

        var $mark = $('<span class="codenav_scroll_indicator_mark"></span>')
            .appendTo($scrollindicator)
            .css('top', height)
            // Fix positioning if code is horizontally scrollable
            //.css('margin-left', -1*Math.max(0, $fcode.width() - 920 + 11))
            .on('click', function() {
                // Note this doesn't handle resize between setup and click.
                scroll_to_lineno(n);
            });
    };

    fns.codenav_clear_marks = function() {
        $('.codenav_scroll_indicator_mark').remove();
    };
}

/**
 * As we scroll past the top of the file code container, attach the line marker container to be
 * fixed in the viewport (& reset it to be contained in the file container if we scroll back up.)
 */
function setup_scroll_bar_positioning() {
    // This function is called on pjax page loads (where the window object persists but the page
    // content changes), so first unregister any old window event handlers before adding new ones
    $(window)
        .off('scroll.codenav')
        .off('resize.codenav');

    if (!is_code_page()) {
        return;
    }

    var $bwrapper = $('.blob-wrapper');
    var $scrollindicator = $('.codenav_scroll_indicator');

    // Cache the current 'position' attribute of $scrollindicator to save a CSS lookup/set each scroll
    var last_position = null;

    // On page scroll, check if the $scrollindicator container holding our line markings should be
    // attached to its parent like a normal element, or fixed in the viewport as we scroll down
    $(window).on('scroll.codenav', function() {
        var amount_scrolled_below_top_of_bwrapper = $(window).scrollTop() - $bwrapper.offset().top;
        var amount_scrolled_below_bottom_of_bwrapper = amount_scrolled_below_top_of_bwrapper +
            $(window).height() - $bwrapper.height();

        if (amount_scrolled_below_top_of_bwrapper > 0) {
            // If we've scrolled past the top of the code blob container, fix $scrollindicator to viewport
            if (last_position !== 'fixed') { // Only update CSS attributes if not already set correctly
                $scrollindicator
                    .css('position', 'fixed')
                    // We don't need to add padding for the file header bar because it's scrolled offscreen
                    // at this point
                    .css('top', '0px')
                    .css('left', Math.round($bwrapper.offset().left + $bwrapper.width() - 7) + 'px');

                last_position = 'fixed';
            }
        } else {
            // If we're above the top of the code blob container, attach $scrollindicator to it
            if (last_position !== 'absolute') {
                $scrollindicator
                    .css('position', 'absolute')
                    // We add 45px of padding above it to account for the file header info/actions bar
                    .css('top', '45px')
                    .css('left', 'auto');

                last_position = 'absolute';
            }
        }

        if (amount_scrolled_below_bottom_of_bwrapper > 0) {
            $scrollindicator.height($(window).innerHeight() - amount_scrolled_below_bottom_of_bwrapper);
        } else {
            $scrollindicator.height($(window).innerHeight());
        }
    });

    // We resize the $scrollindicator container to be the visible height of the blob wrapper
    $(window).on('resize.codenav', function() {
        $scrollindicator.height($(window).innerHeight());
        $(window).trigger('scroll.codenav');
    });
}

function scroll_to_lineno(n) {
    var $bwrapper = $('.blob-wrapper');
    var $lineelt = $('#LC' + n);
    var linepos = $lineelt.offset().top;
    var margin = Math.round($lineelt.height() / 3);
    $('html, body').animate({
        scrollTop: (linepos - margin)
    });
}

function is_code_page() {
    return $('#LC1').length > 0;
}

setupCss();

// Try once after page loads
trySetup();

// This is needed since Github uses AJAX to load new page contents, so we need to constantly monitoring the page
setInterval(function() {
    trySetup();
}, 2000);
