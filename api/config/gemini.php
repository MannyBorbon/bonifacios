<?php
define('GEMINI_API_KEY',   'AIzaSyCH4NQtGT0ueeMh9zEhgf6qRKNm5U3FkcQ');
define('GEMINI_MODEL',     'gemini-2.0-flash');
define('GEMINI_API_URL',   'https://generativelanguage.googleapis.com/v1beta/models/'
                           . GEMINI_MODEL . ':generateContent?key=' . GEMINI_API_KEY);
define('GEMINI_TIMEOUT',   12);
