<!-- Lalaps.description:start -->
This issue provides visibility into Lalaps updates and their statuses.

<% for(const [advisory, details] of Object.entries(advisories)) {-%>

# <%-advisory%>
<% for(const detail of details){ -%>
<%-detail%>
<%}-%>

<%}-%>
<!-- Lalaps.description:end -->
