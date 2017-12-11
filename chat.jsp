<%@ page contentType="text/html; charset=utf-8" pageEncoding="utf-8"%>
<!DOCTYPE html>
<html lang="ko">
<head>
<%@ include file="/jsp/common/include/incMeta.jsp"%>
<%@ include file="/jsp/common/include/incCommon.jsp"%>
<link href="/assets/css/teachertalk.css?_v=<%=CSS_VERSION%>"
	rel="stylesheet" type="text/css">
<script src="/assets/js/teachertalk.js?_v=<%=JS_VERSION%>"></script>
<script>
	$(window).load(function(){
	    teachertalk.setSocketEndPoint('${teacherTalkEndPoint}');
	    teachertalk.setStuId('${stuId}');
	    teachertalk.setData(JSON.parse(localStorage.getItem('teacherTalkMsg_${stuId}')) || []);
	
	    // init
	    teachertalk.init();
	});
</script>
</head>

<body>
	<div class="ssamtalk" id="ssamtalk"></div>
</body>
</html>