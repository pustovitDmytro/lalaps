<!-- Lalaps.details:start -->
<!-- Lalaps.verbosity: <%=level%> -->
<% if(level > 0){ %>
Fixed <%=report.meta.vulnerabilities.total.change%> of <%=report.meta.vulnerabilities.total.before%> npm vulnerabilities.
<%=report.meta.vulnerabilities.total.after%> issues left. 
<% if(report.meta.vulnerabilities.total.rate){ -%>
Success Rate: **<%=(report.meta.vulnerabilities.total.rate*100).toPrecision(3)%>%**
<% } -%>
<% } -%>
<% if(level === 1){ -%>

**Severity**:
    <% for(const [severity, stat] of Object.entries(report.meta.vulnerabilities.categories) ) {%><% if(stat.rate){ %>
    * **<%=severity%>**: fixed <%=stat.change%> of <%=stat.before%>. <% if(stat.rate){ %> (<%=(stat.rate*100).toPrecision(3)%>%) <% } %>
    <% } %><% } %>
<% } -%>
<% if(level >=2){ -%>

**Vulnerabilities**:
<% for(const advisory of report.advisories) {%>
<!-- Lalaps.advisory.<%=advisory.id%>:start -->
[<%=advisory.title%>](<%=advisory.url%>)
Library: `<%=advisory.vulnerableLibrary%>`
Affected versions: `<%-advisory.range%>`
Severity: **<%=advisory.severity%>**
<% if(advisory.fix){ -%>
Fix: <% if(advisory.isFixed){%>:heavy_check_mark:<%}else{%>:x:<%}%> `<%-advisory.fix%>`
Root Libraries: 
<% for(const lib of advisory.rootLibraries) {-%>
 - <% if(lib.isFixed){%>:heavy_check_mark:<%}else{%>:x:<%}%> `<%=lib.name%> <%-lib.range%>`. <% if(lib.fix){%>Fixed in `<%-lib.fix%>`<%}%>
<% } -%>
<% } -%>
<!-- Lalaps.advisory.<%=advisory.id%>:end -->
<% } -%>
<% } -%>

<!-- Lalaps.details:end -->
