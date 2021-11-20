<!-- Lalaps.vulnerability.<%=vulnerability.id%>:start -->
[<%=vulnerability.title%>](<%=vulnerability.url%>)
Library: `<%=vulnerability.vulnerableLibrary%>`
Affected versions: `<%-vulnerability.range%>`
Severity: **<%=vulnerability.severity%>**
<% for(const pr of vulnerability.prs) {-%>
:heavy_check_mark: #<%=pr%>
<% } -%>
Root Libraries:
<% for(const lib of vulnerability.rootLibraries) {-%>
 - <%if(lib.prs.length){%>:heavy_check_mark:<%}else{%>:x:<%}%> `<%=lib.name%>`<% for(const pr of lib.prs) {%> #<%=pr%><%}%>
<% } -%>
<!-- Lalaps.vulnerability.<%=vulnerability.id%>:end -->