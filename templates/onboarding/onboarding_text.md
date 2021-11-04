<!-- Lalaps.description:start -->
To activate Lalaps, merge this Pull Request. To disable Lalaps, just close this Pull Request unmerged.

# Configuration Summary:
<% for(let [index,data] of descriptions.entries()){  %>
 ## <%=index+1%>: <%=data.type%>
 <% for(const message of data.description){  %>
 <%-message%>
 <%} %>
<%} %>
<!-- Lalaps.description:end -->
