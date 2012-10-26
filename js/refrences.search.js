/* 
 *
 * @author shatzibitten
 * @todo 
 *       FIX. Case sensitive.
 *       FIX. Button events.
 *       Добавить типы отображения status bar.
 *       Сделать возможным передачу списка узлов, в которых искать не нужно;
 *       Манипуляции с history для подстановки текущей URL;
 *       Запретить работу стрелок в input;
 *       Вынести перемещение по найденым элементам в отдельный метод.
 *       
 * @ver    0.7b
 */
(function($){
    /**
     * @param <boolean> targetName     Name of the element where we will search
     * @param <object>  targetElement  Element where data (search result) will be append.
     *                                 If "panel" option is true - requested text will be searching and highliting in this element.
     * @param <string>  requestParam   Parameter that used in ajax request.
     * @param <string>  url            Url to server script. Used in ajax request. Url to source that return result.
     *                                 Array of urls can be use only when "panel" option is true.
     * @param <integer> smblsTrigger   Number of symbols to start. In PANEL MODE this option set the minimum of symbols for search request.
     * @param <array>   objs           Array of objects that's can handle public events (see EVENTS).
     * @param <array>   message        Key-value collection with parameters for message manager. 
     *                   - lang        Messages language. RU by default.
     *                   - callback    Function that will be execute when some message comming. For default message will show in alert().
     *                   
     * @param <boolean> panel          "Next", "Prev", "X", Input controls status. Turn on PANEL MODE.
     * @param <boolean> highlight      Highlight search result
     *
     * EVENT USES ONLY WITH PANEL MODE.
     * ---- EVENTS ----
     * "targetElement" events
     * - inputSearch.start       - Occurs when user reaches first found element in targetElement. (Public event)
     * - inputSearch.close       - Hide panel and clear targetElement from highlight.
     * - inputSearch.end         - Occurs when reached the end of the found result set.(last found element). (Public event)
     * - inputSearch.loadPortion - Load portion of data from urls array.
     * - inputSearch.prevPortion - Occurs when need to load previous portion of data. Bound loadPortion event with special option. (Public event)
     * - inputSearch.nextPortion - Occurs when need to load next portion of data. Bound loadPortion event with special option. (Public event)
     * -----------------
     */   
    $.fn.inputSearch = function(params){

        var CSS_SLCTS = {
            NEXT_ID:   "#search-next",
            PREV_ID:   "#search-prev",
            STATUS_ID: "#search-status",
            INPUT_ID:  "#search",
            CLOSE_ID:  "#search-close",
            SEARCH_ID: "#search-all",
            FOUND_CLS: ".found"
        };

        var EVENT_PX = "inputSearch";         //events prefix
        
        var EVENTS   = {
            start:   EVENT_PX + ".start",
            load:    EVENT_PX + ".loadPortion",
            next:    EVENT_PX + ".nextPortion",
            prev:    EVENT_PX + ".prevPortion",
            end:     EVENT_PX + ".end",
            close:   EVENT_PX + ".close"
        }

        var options = {
            targetName:      "result-input-search",
            targetSelector:  "#result-input-search",
            targetElement:   $("#result-input-search"),
            requestParam:    "search_req",
            url:             "",
            objs:            [],
            highlight:       true,
            panel:           false,
            message:         {
                lang:     "eng",
                callback: false
            },
            smblsTrigger:    3
        };

        /**
         * Init options.
         * @todo: Make private method or function and replace in it.
         */
		if (params.targetElement == undefined ||  params.targetElement == null) 
		 {
			params.targetElement = $(params.targetSelector || options.targetSelector);
 		 }
		
        $.extend(options, params);
        $.extend(CSS_SLCTS, {
            RES_SLCT: options.targetSelector
        });

        if (options.objs && $.isArray(options.objs))
         {
          options.objs.push($(CSS_SLCTS.STATUS_ID));
         }

        var MsgManager     = function(options) {
           
           var _params = {
                          lang: "eng", 
                          callback: false
                         };
                         
            var _MSGS = {
                CONFIRM_NEXT:   {
                                 ru:  "Перейти на одну страницу вперед для продолжения поиска?",
                                 kk:  "Іздеуді жалғастыру үшін келесі бетке ауысу керек пе?",
                                 eng: "Go to the next page to continue search?"
                                },
                                
                CONFIRM_PREV:   {
                                 ru:  "Перейти на одну страницу назад для продолжения поиска?",
                                 kk:  "Іздеуді жалғастыру үшін алдыңғы  бетке ауысу керек пе?",
                                 eng: "Go to the previous page to continue search?"
                                },
                                
                NOTHING:        {
                                 ru: "Ничего не найдено на текущей странице!",
                                 kk: "Ештеңе табылмады!",
                                 eng: "Nothing matches found!"
                                },
                                
                LIMIT:          {
                                 ru:  "Достигнут конец документа!",
                                 kk:  "",
                                 eng: "Reached end of document!"
                                },
                                                
                PAGE:           {
                                  ru:  "стр.",
                                  kk:  "бет",
                                  eng: "page"
                                },
               
               INVALID:        "Incorrect locale!"

            }
            
            var _methods = {
                retrive: function(key) {
                 
                 if (_MSGS[key] === undefined)   
                  {
                      
                   if (console)
                    {
                     console.log("Invalid key!");
                    }
                   else
                    {
                     alert("Invalid key!");   
                    }
                    
                  }
                  
                  return _MSGS[key][_params.lang] === undefined ? _MSGS.INVALID : _MSGS[key][_params.lang];
                } 
            }

            options.lang = options.lang.toLowerCase();                   

            $.extend(_params, options);

            return {
                
                show: function(key) {
           
                    if (_params.callback && (typeof (_params.callback) === "function"))
                     {
                      _params.callback.apply(this, [_methods.retrive(key)]);
                      
                      return;
                     }
                     
                     alert(_methods.retrive(key));
                     
                     return;
                },
                
                get: function(key) {
                    return _methods.retrive(key);
                }
                
            }
            
        }
        
        var FindCursor     = function(elems) {

            var foundItems = [];
            var firstPos   = 0;
            var currentPos = 0;
            var lastPos;

            var methods = {
                init: function(elems) {
                    var len     = elems.length;
                    lastPos     = len - 1; //set -1 becacuse this value define as false

                    for (var i = 0; i < len; i++)
                    {
                        foundItems.push(elems[i]);
                    }
                },

                getNextPos: function() {
                    currentPos = Math.min(currentPos + 1, lastPos);
                    return currentPos;
                },

                getPrevPos: function() {
                    currentPos = Math.max(currentPos - 1, firstPos);
                    return currentPos;
                },

                getFirstPos: function() {
                    return firstPos;
                },

                getLastPos: function() {
                    return lastPos;
                },

                setCurrentPos: function(newPos) {
                    if (newPos <= lastPos)
                     {
                      currentPos = newPos;
                     }
                }
            };

            methods.init(elems);

            return {
                getElementPos: function(el) {
                   return $.inArray(el, foundItems);
                },
                getNext: function() {
                    return foundItems[methods.getNextPos()];
                },

                getFirstPos: function() {
                    return methods.getFirstPos();
                },

                getLastPos: function() {
                    return methods.getLastPos()
                },

                getPrev: function() {
                    return foundItems[methods.getPrevPos()];
                },

                getFirst: function() {
                    return foundItems[methods.getFirstPos()];
                },

                getLast: function() {
                    return foundItems[methods.getLastPos()];
                },

                isLast: function() {
                    return currentPos === methods.getLastPos();
                },

                setCurrentPos: function(newPos) {
                    if (newPos < 0)
                     {
                      console.log("Incorrect value for element position!");
                      //alert("Incorrect value for element position!");
                      newPos = 0;
                      
                      return false;
                     }
                     
                    methods.setCurrentPos(newPos);
                },

                getCurrentPos: function() {
                    return currentPos;
                },

                clear: function() {
                    foundItems = [];
                    currentPos = 0;
                },
                
                getCurrent: function() {
                    return foundItems[currentPos];
                },
                getAll: function() {
                    return foundItems;
                },

                isEmpty: function() {
                    return lastPos < 0 ? true : false;
                }
            }
        };
        
        var Storage        = function() {
            if (typeof(localStorage) == 'undefined' || !localStorage)
             {
              var localStorage;

              localStorage.setItem = function(name, item) {
                  $.cookie(name, item);
              };

              localStorage.getItem = function(item) {
                  $.cookie(item);
              };
             }

            var activeKey = 'active';

            var methods =
             {
                isHtml5: function() {
                   if (typeof(localStorage) == 'undefined')
                       return true;

                   return false;
                },

                isActive: function() {
                    return localStorage.getItem(activeKey);
                },

                init: function() {
                    localStorage.setItem(activeKey, true);
                }
             }
             
            return {
               setItem: function(name, item) {
                   localStorage.setItem(name, item)
               },

               setItems: function(items) {
                $.each(items, function(index, value){
                    localStorage.setItem(index, value);
                });
               }
            };
        }

        var $this          = this;

        var $window        = window;

        var exceptionsKeys = [40, 38, 39, 37, 27, 18]; //up, down, left, right, escape, alt buttons code

        var findElementsCursor = new FindCursor([]); //cursor contain all found elements top position.

        var messageManager     = new MsgManager(options.message);  
        
        var timeout;       
        

        /**
         * Find children of element by selector and return them as DOM elements.
         * @return <array> return array of dom elements.
         **/
        function getChildrenBySelector(name, object) {
            var result = [];
            object.find(name).each(function(){
                result.push($(this)[0])
            })

            return result;
        };
        
        //doesn't use in this plugin, but it's work and you can use it.
        function highlightText(needle, haystack) {
            var className   = "highlight-search";
            var regEx       = new RegExp("("+needle+")","gi");
            
            return regEx.test(haystack) ? haystack.replace(regEx,"<span id='" + className + "'>$1</span>") : false;
        }

        //clear "found marks"
        function clearfound (node) {
            if ($.isArray(node))
             {
              var nodeLen = node.length;
              for (var i = nodeLen - 1; i >= 0; i--)
                clearfound(node[i]);
             }
            else
             {
              var txt = node.previousSibling.nodeValue + node.firstChild.nodeValue + node.nextSibling.nodeValue;

              node.parentNode.removeChild(node.nextSibling);
              node.parentNode.removeChild(node.previousSibling);
              node.parentNode.replaceChild(document.createTextNode(txt), node);
             }
        };

        /**
         * The list of objects exceptions.
         **/
        function inExcludeList(list, node) {
            //node.attr(id);
        }

        function nodewalk (node, str) {
            var phrase, matches, splitter, frag, foundEl;
            var nodeTextType = 3;
            var nodeLength   = node.length;
            
            for (var i = 0; i < nodeLength; i++)
            {
                if (node[i].hasChildNodes() && 'SCRIPT' !== node[i].nodeName)
                    nodewalk(node[i].childNodes,str);

                phrase = new RegExp(str,'ig');

                if (nodeTextType === node[i].nodeType)
                {
            
                    var cachedDoc    = document;

                    matches  = node[i].nodeValue.match(phrase);

                    splitter = node[i].nodeValue.split(phrase);
                    frag = cachedDoc.createDocumentFragment();

                    if (matches !== null && options.highlight)
                    {
                        //console.log(splitter);
                        frag.appendChild(cachedDoc.createTextNode(splitter[0]));

                        var matchesLength  = matches.length;

                        for (var j = 0, jj = matchesLength; j < jj; j++)
                        {
                            foundEl = cachedDoc.createElement('span');
                            foundEl.appendChild(cachedDoc.createTextNode(matches[j]));
                            foundEl.className = 'found';
                            frag.appendChild(foundEl);
                            
                            $(foundEl).data("seqNumber", j+1);
                            
                            if (splitter[j+1] == undefined)
                                splitter[j+1] = ' ';

                            frag.appendChild(cachedDoc.createTextNode(splitter[j+1]));
                        }
                        
                        node[i].parentNode.replaceChild(frag,node[i]);
                        i+=jj*2;
                    }
                }
            }
        }

        /*
         * Search string in source and save searched elements top coordinates in FindCursor
         * @param  str    <string>        Searched string
         * @param  source <jQuery object> Place where need to search. Default is options.targetElement
         * @return <boolean> True - if something was found, otherwise false
         */
        function search(str, source) {
                        
            if (!source)
             {
                var source = options.targetElement;
             }

            var nodes       = getChildrenBySelector(CSS_SLCTS.FOUND_CLS, source);

            clearfound(nodes);

            //walk throw nodes and search string
            nodewalk(source[0].childNodes, str);

            //create cursor with founded elements top coordinat
            var elsTop = $.map(getChildrenBySelector(CSS_SLCTS.FOUND_CLS, source), elemTop);
            findElementsCursor = new FindCursor(elsTop);

            return findElementsCursor.getLastPos() > -1 ? true : false;
        };

        /*
         * Get top coordinate of the element
         * @param <DOM object> elem Element from DOM tree.
         */
        function elemTop(elem) {
            return elem.top || elem.pixelTop || elem.offsetTop || 0;
        }

        /*
        * load portion of text from array of urls.
        * @param <string> URL of source
        */
        function loadPortion(url) {
                  return $.ajax({
                      url: url,
                      global: true,
                      context: options.targetElement,
                      beforeSend:  function() {
                        //disable panel while send request and show loader
                        $(CSS_SLCTS.STATUS_ID).html("");
                        $(CSS_SLCTS.STATUS_ID).addClass("loader");
                        
                        $.each(CSS_SLCTS, function(index, value){
                            $(value).attr("disabled", true);
                      });
                      },
                      success: function(response) {
                        //hide loader
                        $(CSS_SLCTS.STATUS_ID).removeClass("loader");
                        
                        //enable panel when request success
                        $.each(CSS_SLCTS, function(index, value){
                           $(value).attr("disabled", false);
                        });
						
                      },
                      error: function(response) {
                        console.log(response);
                        $.each(CSS_SLCTS, function(index, value){
                           $(value).attr("disabled", false);
                        });
                      }
                  }).promise();
        }


        /**
         * Trigger events with "eventName".
         * 
         * @param <string> eventName Name of the event
         * @param <any>    data      Additional data that will be passed to triggered objects.
         */
        function triggerObjs(eventName, data) {
            if (options.objs[0] !== "undefined" && options.objs[0] != null)
             {
              $.each(options.objs,function(index, obj){
                obj.trigger(eventName, data);
              });
             }
        }
        
        //@todo Create class(entity) Match. 
        function goToNextMatch() {
            $window.scrollTo(0,  findElementsCursor.getNext());
        }
        
        function goToPrevtMatch() {
            $window.scrollTo(0,  findElementsCursor.getPrev());
        }
                
        function goToMatch(matchPos) {
            $window.scrollTo(0,  matchPos);
        }

        var searchIndicator    = false;
        
        //Logic
        if (options.panel)
         {

          if ($.isArray(options.url))
           {
            var UrlCursor = new FindCursor(options.url);
           
            //init current active url for correct search within pages.
            if (options.url.current && UrlCursor.getElementPos(options.url.current))
             {             
              UrlCursor.setCurrentPos(UrlCursor.getElementPos(options.url.current));
             }
           }

           //bind on panel
            $this.bind(EVENTS.close, function(){
                 clearfound(getChildrenBySelector(CSS_SLCTS.FOUND_CLS, options.targetElement));
 
                 findElementsCursor.clear();

                 $(this).hide();
            });

            options.targetElement.bind(EVENTS.start, function(event){
                
                if (UrlCursor && typeof (UrlCursor) !== "undefined" && searchIndicator === true)
                 {
                  //go to the previous portion of text because it's end of current
                  if (UrlCursor.getCurrent() != UrlCursor.getFirst())
                   {
                    $(this).trigger(EVENTS.prev);
                   }

                 }
            })
            
            options.targetElement.bind(EVENTS.end, function() {

                //too many recursion calls
                //triggerObjs(EVENTS.end);

                if (UrlCursor && typeof (UrlCursor) !== "undefined" && searchIndicator === true)
                 {
                  //go to the next portion of text because it's end of current
                  if (UrlCursor.getCurrent() != UrlCursor.getLast())
                   {
                    $(this).trigger(EVENTS.next);
                   }
                  else
                   {
                    //message about end of search
                    messageManager.show("LIMIT");
                   }

                 }
            });

            options.targetElement.bind(EVENTS.load, function(event, url, type){

                //@todo переместить это в функцию search и немного подкоректировать. Это позволит сосредоточить логику поиска в одном месте
                loadPortion(url).done(function(response){
				
					  var DOMresponse = ["application/xml", "application/html"];
					  if ($.inArray(response.contentType, DOMresponse) > -1) 
					   {
					    response = $(response).text();
					   }
					   
                      //create temp element
                      //var tempSource = $("<div></div>");
                      //tempSource[0].innerHTML = response;
                      var searchStatus = false
                      var req          = $(CSS_SLCTS.INPUT_ID).val();

					  options.targetElement.html("");
                      //use native property instead of $().html(), because don't know how much data will comes from server.
                      options.targetElement[0].innerHTML = response;

                      searchStatus = search(req, options.targetElement);

                      triggerObjs(type,[UrlCursor.getCurrent()]); //pass current url and trigger event
                      
                      if (searchStatus === false) //if there isn't any matches
                       {
			//show message
                        messageManager.show("NOTHING");
			//and trigger current event to go to the next or previous page
                        options.targetElement.trigger(type);                       
                       }
                      else
                       {
                         switch (type)
                         {
                          case EVENTS.next:
                               findElementsCursor.setCurrentPos(findElementsCursor.getFirstPos());
                          break;

                          case EVENTS.prev:
                               findElementsCursor.setCurrentPos(findElementsCursor.getLastPos());
                          break;

                          default:
                          break;
                         }

                         $window.scrollTo(0, findElementsCursor.getCurrent());
                       }
                  });
            });
            
            //take next portion of text
            options.targetElement.bind(EVENTS.next, function(event){
                
                if (UrlCursor && UrlCursor.isLast() === false)
                 {
                  if (confirm(messageManager.get("CONFIRM_NEXT")))
                   {
                    $(this).trigger(EVENTS.load, [UrlCursor.getNext(), EVENTS.next ])
                   }
                 }
            });

            //take previous portion of text
            options.targetElement.bind(EVENTS.prev, function(event) {

                if (UrlCursor && (UrlCursor.getCurrentPos() > UrlCursor.getFirstPos()))
                  {
                   if (confirm(messageManager.get("CONFIRM_PREV")))
                    {
                     $(this).trigger(EVENTS.load, [UrlCursor.getPrev(), EVENTS.prev]);
                    }
                  }
            });

            $(CSS_SLCTS.STATUS_ID).bind(EVENTS.next, function(){
                      $(this).text(UrlCursor.getCurrentPos() + 1 + " " + messageManager.get("PAGE"));
            });

            $(CSS_SLCTS.STATUS_ID).bind(EVENTS.prev, function(){
                      $(this).text(UrlCursor.getCurrentPos() + 1 + " " + messageManager.get("PAGE"));
            });

            //initiate search action
            $(CSS_SLCTS.SEARCH_ID).click(function(){
                var req          = $(CSS_SLCTS.INPUT_ID).val();
                var source       = options.targetElement;

                if (req.length >= options.smblsTrigger)
                  {
                   var searchResult = search(req, source);
                   
                   searchIndicator  = true;

                   if (searchResult === false)
                    {
                     messageManager.show("NOTHING");
                     
                     findElementsCursor.clear();
                    }
                   else
                    {
                     $window.scrollTo(0,  findElementsCursor.getFirst());
                    }
                  }
                  
                return false;
            });

            //go to the next match
            $(CSS_SLCTS.NEXT_ID).click(function(){
                
                if (findElementsCursor.isLast())
                 {
                  options.targetElement.trigger(EVENTS.end);
                 }
                else
                 {
                  $window.scrollTo(0,  findElementsCursor.getNext());
                 }
                return false;
            });
            
            //go to the previous match
            $(CSS_SLCTS.PREV_ID).click(function(){
                
               if (findElementsCursor.getCurrent() === findElementsCursor.getFirst())
                {
                 options.targetElement.trigger(EVENTS.start);
                }

               $window.scrollTo(0,  findElementsCursor.getPrev());

               return false;
            });
          
            //close search panel and delete all marks
            $(CSS_SLCTS.CLOSE_ID).click(function() {
                $this.trigger(EVENTS.close);
                return false;
            });

            $("body").keyup(function(event){
               
               if ("#"+$(event.target).attr("id") === CSS_SLCTS.INPUT_ID)
                {
                 event.preventDefault();
                 return false;
                }
                 
                switch(event.keyCode) {
                    case 27: //escape
                        $.trigger(EVENTS.close);
                    break;
                    
                    case 39: //left arrow
                        $(CSS_SLCTS.NEXT_ID).click();
                    break;

                    case 37: //right arrow
                        $(CSS_SLCTS.PREV_ID).click();
                    break;

                    default:
                    break;
                }
            });
          
         }
        else
         {
          /**
           * With symbols trigger option and ajax request.
           */
            $(this).keyup(function(event){

                if (this.value.length >= options.smblsTrigger && $.inArray(event.keyCode, exceptionsKeys) === -1)
                {
                
                    var req = this.value; //current value of input

                    if (timeout)
                        clearTimeout(timeout);

                    //if url is defined then send ajax request
                    if (options.url && options.url.length > 0 && $.isArray(options.url) == false)
                    {
                        //create some timeout for request.
                        timeout = setTimeout(function(){

                            $.ajax({
                                url:     options.url,
                                data:    options.requestParam + "=" + encodeURI(req) + "&type=" + encodeURIComponent(options.targetSelector),
                                context: options.targetElement,
                                beforeSend: function() {
                                    options.targetElement.html("");
                                },
                                success: function(data, textStatus, xhr) {

                                    if (options.highlight)
                                    {
                                        var searchBlock     = $("<div></div>").appendTo(document.createDocumentFragment());
                                        searchBlock.html(data);
                                        nodewalk(searchBlock[0].childNodes, req);                                                                              
                                    }
                                    $(this).html("");
                                    $(this).append(searchBlock[0].innerHTML);
                                },
                                error: function(jqXHR, textStatus) {
                        
                                }
                            });
                        }, 700 );
                
                    }
                }
            });
         }

        return $(this);
    };
})(jQuery);

