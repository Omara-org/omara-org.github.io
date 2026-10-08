---
layout: single
title:
author_profile: true
staff_members: true
---
<script type="text/javascript"
        src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.0/MathJax.js?config=TeX-AMS_CHTML"></script>

<style>
figure {
  padding: 0px;
  margin: 0;
  width:154px;
  margin-bottom: 0px;
}

.img {
  margin-bottom: 0px;
}

.div1 {
  border: 3px #dddbdb;
  border-radius: 25px;
  background: #e7e7e7;
  background-position: left top;
  background-repeat: repeat;
  margin-bottom: 10px;
  padding: 10px;
}


figcaption {
  background-color: black;
  color: white;
  font-style: italic;
  padding: 2px;
  text-align: center;
  display: block;
}
</style>


{% for author in site.authors %}
  <div class="div1">
  
    <h2><figure><img src="{{author.image}}"/></figure>{{ author.name }}</h2>
    <h3>{{ author.position }}</h3>
    <p>{{ author.content | markdownify }}</p>

  </div>
{% endfor %}

