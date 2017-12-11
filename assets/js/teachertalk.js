var teachertalk = (function () {
    var state = {
        teacherTalkEndPoint : '',
        webSocket : null,
        stuId : null,
        data : [],
        paging : {
            totalCnt : 0,
            newCnt : 0,
            pageSize : 30,
            pageNo : 1,
            endPageNo : 1
        },
        scrollPos : 0,
        deleteMsg : {
            talkNo : null,
            idx : null
        },
        msgInterval : null,
        msgIntervalTime : 2000
    };
    
    /**
     * 웹소켓 준비
     */
    function webSocketInit () {
        var protocol = (state.teacherTalkEndPoint.indexOf('localhost') == -1) ? 'wss://' : 'ws://';
        var uri = protocol + state.teacherTalkEndPoint + '/sigong/middle/teacherTalkSend/' + state.stuId;
        state.webSocket = new WebSocket(uri);
        // 웹소켓 오픈
        state.webSocket.onopen = function (event) {
            console.log('onopen: ', event);
        };
        // 에러
        state.webSocket.onerror = function (event) {
            console.log('Web Socket Connect Error: ', event);
            window['android'].showWebDialog(0, '알림', 'Web Socket Connect Error', '확인', null);
        };
        // 메세지 받기
        state.webSocket.onmessage = function (event) {
            console.log('onmessage: ', event);
            newMessage();
        };
    };
    /**
     * 웹소켓 푸시
     */
    function webSocketSend (msg) {
        var message = {
            msgContent: $.trim(msg),
            stuId: state.stuId,
        };
        state.webSocket.send(JSON.stringify(message));
    };
    
    function readMessage () {
        $.ajax({
            url : "/api/teacherTalk/completeMsgRead.djson",
            contentType : "application/json; charset=UTF-8",
            success : function (res) {
                // 스크롤 최하단으로 이동
                scrollToBottom();
            },
            error : function () {
                window['android'].showWebDialog(0, '알림', '시스템에 문제가 발생하였습니다.', '확인', null);
            }
        });
    };
    
    function newMessage () {
        $.ajax({
            url : "/api/teacherTalk/teacherTalkNewMsg.djson",
            contentType : "application/json; charset=UTF-8",
            success : function (res) {
                if (res.result) {
                    state.paging.newCnt = res.result.newMessageCount;
                    state.paging.pageSize = state.paging.newCnt > 30 ? state.paging.newCnt : 30;
                    if (state.paging.newCnt > 0) {
                        var newMsgList = res.result.newMsgList.filter(function (item) {
                          return item.senderDelYn == 'N'
                        });
                        var data = state.data.concat(newMsgList);
                        state.data = data;
                        state.scrollPos = state.data.length - 1;
                        
                        makeHtml();
                        
                        localStorage.setItem('teacherTalkMsg_' + state.stuId, JSON.stringify(state.data));

                        readMessage();
                    }
                }
            },
            error : function () {
                window['android'].showWebDialog(0, '알림', '시스템에 문제가 발생하였습니다.', '확인', null);
            }
        });
    };
    
    function sendMessage (msg) {
        msg = convertSystemSourceToHtml(msg); //특수문자 치환
        var params = {
            talkType : 'S',
            msgType : 'T',
            msgContent : msg
        };
        $.ajax({
            url : "/api/teacherTalk/registTalkMsg.djson",
            contentType : "application/json; charset=UTF-8",
            type: 'POST',
            data : JSON.stringify(params),
            success : function (res) {
                if (res.result) {
                    // webSocketSend(msg);
                    state.data.push(res.result.newMsg);
                    scrollPos = state.data.length - 1;
                    
                    makeHtml();
                    localStorage.setItem('teacherTalkMsg_' + state.stuId, JSON.stringify(state.data));
                    
                    // 스크롤 최하단으로 이동
                    scrollToBottom();
                }
            },
            error : function () {
                window['android'].showWebDialog(0, '알림', '전송에 실패하였습니다.', '확인', null);
            }
        });
    };
    
    function sendImgMessage (res) {
        var newMsg = JSON.parse(res);
        // webSocketSend('sendImg');
        state.data.push(newMsg);
        scrollPos = state.data.length - 1;
        
        makeHtml();
        localStorage.setItem('teacherTalkMsg_' + state.stuId, JSON.stringify(state.data));
    
        // 스크롤 최하단으로 이동
        scrollToBottom();
    };
    
    function syncMessage () {
        $.ajax({
            url : "/api/teacherTalk/teacherTalkSyncMsg.djson",
            contentType : "application/json; charset=UTF-8",
            success : function (res) {
                if (res.result) {
                    state.data = res.result.syncMsgList.filter(function (item) {
                        return item.senderDelYn == 'N'
                    });
                    state.paging.totalCnt = state.data.length;
                    state.paging.endPageNo = Math.ceil(state.paging.totalCnt / state.paging.pageSize);
                    state.scrollPos = state.data.length - 1;
                    
                    makeHtml();
                    
                    localStorage.setItem('teacherTalkMsg_' + state.stuId, JSON.stringify(state.data));
                    // 스크롤 최하단으로 이동
                    scrollToBottom();
                }
            },
            error : function () {
                window['android'].showWebDialog(0, '알림', '시스템에 문제가 발생하였습니다.', '확인', null);
            }
        });
    };
    
    function makeHtml () {
        var html = '';
        if(!state.data || state.data.length == 0) {
            $('#ssamtalk').addClass('info');
        }
        else {
            $('#ssamtalk').removeClass('info');
            state.data.forEach(function(msg, i) {
                html += `<div class="sec" data-idx='${i}'>`;
                if(i > (state.data.length-1) - (state.paging.pageNo * state.paging.pageSize) ) {
                    if(i == 0 || msg.sendDate != state.data[i-1].sendDate) {
                        html += `
                            <div class="date">
                                <span class="inner">${msg.sendDate} ${CMN.weekday(msg.weekIndex)}</span>
                            </div>
                        `;
                    }
                    
                    // 쌤 메세지
                    if(msg.senderId != state.stuId) {
                        html += `<div class="pull-left">`;
                        
                        // 아바타 이미지
                        var addClass = (i != 0 && msg.senderId == state.data[i-1].senderId && msg.sendDate == state.data[i-1].sendDate && CMN.convert12H(msg.sendTime) == CMN.convert12H(state.data[i-1].sendTime)) ? 'hidden' : '';
                        html += `
                                    <div class="avatar ${addClass}">
                                        <img src="/assets/img/ssamtalk/ico_avatar.png">
                                    </div>
                        `;
                        
                        html += `   <div class="chat">`;
                            
                        // 쌤 ID 제거
                        /*var addClass = (i != 0 && msg.senderId == state.data[i-1].senderId  && msg.sendDate == state.data[i-1].sendDate) ? 'hide' : '';
                        html += `       <div class="teacher ${addClass}">${msg.senderId}</div>`;*/
                        
                        // 텍스트 메세지
                        if(msg.msgType == 'T') {
                            html += `   <ul>`;
                            html += `       <li>`;
                            var addClass = (i == 0 || msg.senderId != state.data[i-1].senderId || msg.sendDate != state.data[i-1].sendDate) ? 'first': '';
                            html += `
                                                <div class="message ${addClass}">
                                                    <div class="text">${msg.msgContent}</div>
                            `;
                            var addClass = (msg.resourceList.length > 0 || i < state.data.length-1 && msg.senderId == state.data[i+1].senderId && CMN.convert12H(msg.sendTime) == CMN.convert12H(state.data[i+1].sendTime)) ? 'hide': '';
                            html += `
                                                    <div class="send-date ${addClass}">${CMN.convert12H(msg.sendTime)}</div>
                                                </div>
                                    `;
                            html += `       </li>`;
                            
                            if(msg.resourceList.length > 0) {
                                msg.resourceList.forEach(function(rsc, j){
                                    html += `
                                            <li>
                                                <div class="doc" onClick="teachertalk.openDoc('${rsc.linkKey1}')">
                                                    <div class="text">
                                                        <div class="title">${rsc.linkTitle}</div>
                                                        <div class="cont">PDF</div>
                                                    </div>
                                    `;
                                    var addClass = j < msg.resourceList.length-1 ? 'hide': '';
                                    html += `
                                                    <div class="send-date ${addClass}">${CMN.convert12H(msg.sendTime)}</div>
                                                </div>
                                            </li>
                                    `;
                                });
                            };
                            html += `   </ul>`;
                        }
                        
                        // 쿠키 메세지
                        else if(msg.msgType == 'C') {
                            html += `
                                        <ul>
                                            <li>
                            `;
                            var addClass = (i == 0 || msg.senderId != state.data[i-1].senderId || msg.sendDate != state.data[i-1].sendDate) ? 'first' : '';
                            html += `               
                                                <div class="cookie ${addClass}">
                                                    <div class="text">${msg.msgContent}</div>
                            `;
                            var addClass = (i < state.data.length-1 && msg.senderId == state.data[i+1].senderId && CMN.convert12H(msg.sendTime) == CMN.convert12H(state.data[i+1].sendTime)) ? 'hide' : '';
                            html += `
                                                    <div class="send-date ${addClass}">${CMN.convert12H(msg.sendTime)}</div>
                                                </div>
                                            </li>
                                        </ul>
                            `;
                        }
                        
                        
                        html += `   </div>`;
                        html += `</div>`;
                    }
                    
                    // 학생 메세지
                    else if(msg.senderId == state.stuId) {
                        html += `
                                <div class="pull-right">
                                    <div class="chat">
                                        <ul>
                                            <li>
                        `;
                        var addClass = (i == 0 || msg.senderId != state.data[i-1].senderId || msg.sendDate != state.data[i-1].sendDate) ? 'first' : '';
                        html += `               <div class="message ${addClass}" data-talkno="${msg.talkNo}" data-idx="${i}">`; // onClick="teachertalk.deleteConfirm('${msg.talkNo}', '${i}')"
                        
                        // 텍스트 메세지
                        if(msg.msgType == 'T') {
                            html += `               <div class="text">${msg.msgContent}</div>`;
                        }
                        // 이미지 메세지
                        else if(msg.msgType == 'I') {
                            html += `
                                                    <div class="image">
                                                        <img src=${msg.msgContent} alt="">
                                                    </div>
                            `;
                        }
                        var addClass = (i < state.data.length-1 && msg.senderId == state.data[i+1].senderId && CMN.convert12H(msg.sendTime) == CMN.convert12H(state.data[i+1].sendTime)) ? 'hide' : '';
                        html += `
                                                    <div class="send-date ${addClass}">${CMN.convert12H(msg.sendTime)}</div>
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                        `;
                    }
                }
                html += `   </div>`;
            });
        }
        
        $('#ssamtalk').html(html);
        $('#ssamtalk .pull-right .message').hammer().on('press', function() {
            var talkNo = $(this).data('talkno');
            var i = $(this).data('idx');
            deleteConfirm(talkNo, i);
        });
    };
    
    function getLocalMessage () {
        state.paging.totalCnt = state.data.length;
        state.paging.endPageNo = Math.ceil(state.paging.totalCnt / state.paging.pageSize);
        state.scrollPos = state.data.length - 1;
        
        makeHtml();
        
        // 스크롤 최하단으로 이동
        scrollToBottom();
    };
    
    function callbackDialog (tag, state) {
        switch (tag) {
            case 1:
                if (state) deleteMessage();
                return;
            case 2:
                return;
            default:
                return;
        }
    };
    
    function deleteConfirm (talkNo, idx) {
        state.deleteMsg = {
            talkNo: talkNo,
            idx: idx
        };
        /**
         * 네이티브 함수 호출 public void showWebDialog(int tag, String title, String
         * message, String confirmtTtle, String cancelTitle)
         */
        console.log('showWebDialog() 호출');
        window['android'].showWebDialog(1, '삭제', '메시지를 삭제하겠습니까?', '삭제', '취소');
    }
    
    function deleteMessage () {
        $.ajax({
            url : "/api/teacherTalk/deleteTalkMsg.djson?stuId=" + state.stuId + "&talkNo=" + state.deleteMsg.talkNo,
            contentType : "application/json; charset=UTF-8",
            success : function (res) {
                if (res.result) {
                    state.data.splice(state.deleteMsg.idx, 1);
                    makeHtml();
                    localStorage.setItem('teacherTalkMsg_' + state.stuId, JSON.stringify(state.data));

                    window['android'].showToast('삭제 되었습니다.');
                }
            },
            error : function () {
                window['android'].showWebDialog(0, '알림', '시스템에 문제가 발생하였습니다.', '확인', null);
            }
        });
    }
    
    function openDoc (link) {
        console.log(`link : ${link}`);
        window['android'].openPdf(link);
    }
    
    function touchView () {
        window['android'].onTouchWebView();
    }
    
    function callbackScroll () {
        if ($(window).scrollTop() == 0) {
            if (state.paging.pageNo <= state.paging.endPageNo) {
                state.scrollPos = (state.data.length) - (state.paging.pageNo * state.paging.pageSize);
                state.paging.pageNo = state.paging.pageNo + 1;
                
                makeHtml();
                
                if ($('.sec[data-idx=' + state.scrollPos + ']').offset()) {
                    scrollTo(0, $('.sec[data-idx=' + state.scrollPos + ']').offset().top);
                }
            }
        };
    }
    
    function scrollToBottom () {
        setTimeout(function() {
            scrollTo(0, $(document).height()); 
        }, 200);
    }
    
    function convertSystemSourceToHtml(str){
        str = str.replace(/</g,"&lt;");
        str = str.replace(/>/g,"&gt;");
        str = str.replace(/\"/g,"&quot;");
        str = str.replace(/\'/g,"&#39;");
        str = str.replace(/\n/g,"<br>");
        
        return str;
    }
    
    function clearMsgInterval() {
        clearInterval(state.msgInterval);
    }
    
    return {
        init : function () {
            // 로컬에 메세지 정보가 있는 경우
            if (this.getData().length > 0) {
                getLocalMessage();
                
                //지정된 간격으로 새 메세지 확인
                state.msgInterval = setInterval(function() {
                    newMessage();
                }, state.msgIntervalTime);
            } else {
                this.syncMessage();
            }
            
            // this.webSocketInit();
            
            $(window).scroll(callbackScroll);
            $('#ssamtalk').hammer().on('tap', function() {
                console.log('onTouchWebView');
                window['android'].onTouchWebView();
            });
        },
        setStuId : function (stuId) {
            state.stuId = stuId;
        },
        getData : function () {
            return state.data;
        },
        setData : function (data) {
            state.data = data;
        },
        setSocketEndPoint : function (teacherTalkEndPoint) {
            state.teacherTalkEndPoint = teacherTalkEndPoint;
        },
        openDoc: function (link) {
            openDoc(link);
        },
        syncMessage : syncMessage,
        newMessage : newMessage,
        sendMessage: sendMessage,
        sendImgMessage: sendImgMessage,
        readMessage: readMessage,
        webSocketInit : webSocketInit,
        callbackDialog : callbackDialog,
        deleteConfirm : deleteConfirm,
        deleteMessage : deleteMessage,
        clearMsgInterval : clearMsgInterval
    }
})();
    
    