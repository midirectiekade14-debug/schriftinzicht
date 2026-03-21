"""
Scraper voor 'De Schatkamer van David' (Treasury of David) - Nederlandse vertaling
Bron: charlesspurgeon.nl
Output: SchriftInzicht JSON format

Alle psalm-URLs zijn afkomstig uit de sitemap van charlesspurgeon.nl.
URL-patroon: psalm-{psalm_nr}{vers_start}-{vers_eind} (geen scheidingsteken)
"""

import json
import re
import time
import sys
import requests
from bs4 import BeautifulSoup
from pathlib import Path

# Alle psalm-URLs uit de sitemap (handmatig geverifieerd)
PSALM_URLS = [
    # Psalm 1
    "https://charlesspurgeon.nl/psalm-11-3/",
    "https://charlesspurgeon.nl/psalm-14-6/",
    # Psalm 2
    "https://charlesspurgeon.nl/psalm-21-6-2/",
    "https://charlesspurgeon.nl/psalm-27-12/",
    # Psalm 3
    "https://charlesspurgeon.nl/psalm-31-5/",
    "https://charlesspurgeon.nl/psalm-36-9/",
    # Psalm 4
    "https://charlesspurgeon.nl/psalm-41-6/",
    "https://charlesspurgeon.nl/psalm-47-9/",
    # Psalm 5
    "https://charlesspurgeon.nl/psalm-51-8/",
    "https://charlesspurgeon.nl/psalm-59-13/",
    # Psalm 6
    "https://charlesspurgeon.nl/psalm-61-8/",
    "https://charlesspurgeon.nl/psalm-69-11/",
    # Psalm 7
    "https://charlesspurgeon.nl/psalm-71-8/",
    "https://charlesspurgeon.nl/psalm-79-18/",
    # Psalm 8
    "https://charlesspurgeon.nl/psalm-81-5/",
    "https://charlesspurgeon.nl/psalm-86-10/",
    # Psalm 9
    "https://charlesspurgeon.nl/psalm-91-7/",
    "https://charlesspurgeon.nl/psalm-98-15/",
    "https://charlesspurgeon.nl/psalm-916-21/",
    # Psalm 10
    "https://charlesspurgeon.nl/psalm-101-11/",
    "https://charlesspurgeon.nl/psalm-1012-18/",
    # Psalm 11
    "https://charlesspurgeon.nl/psalm-111-3/",
    "https://charlesspurgeon.nl/psalm-114-7/",
    # Psalm 12
    "https://charlesspurgeon.nl/psalm-121-6/",
    "https://charlesspurgeon.nl/psalm-127-9/",
    # Psalm 13
    "https://charlesspurgeon.nl/psalm-131-2/",
    "https://charlesspurgeon.nl/psalm-133-6/",
    # Psalm 14
    "https://charlesspurgeon.nl/psalm-141-3/",
    "https://charlesspurgeon.nl/psalm-144-7/",
    # Psalm 15
    "https://charlesspurgeon.nl/psalm-15/",
    # Psalm 16
    "https://charlesspurgeon.nl/psalm-161-5/",
    "https://charlesspurgeon.nl/psalm-166-11/",
    # Psalm 17
    "https://charlesspurgeon.nl/psalm-171-6/",
    "https://charlesspurgeon.nl/psalm-177-15/",
    # Psalm 18
    "https://charlesspurgeon.nl/psalm-181-4/",
    "https://charlesspurgeon.nl/psalm-185-20/",
    "https://charlesspurgeon.nl/psalm-1821-25/",
    "https://charlesspurgeon.nl/psalm-1826-29/",
    "https://charlesspurgeon.nl/psalm-1830-46/",
    "https://charlesspurgeon.nl/psalm-1847-51/",
    # Psalm 19
    "https://charlesspurgeon.nl/psalm-191-7/",
    "https://charlesspurgeon.nl/psalm-198-15/",
    # Psalm 20
    "https://charlesspurgeon.nl/psalm-201-5/",
    "https://charlesspurgeon.nl/psalm-206-10/",
    # Psalm 21
    "https://charlesspurgeon.nl/psalm-211-7/",
    "https://charlesspurgeon.nl/psalm-218-14/",
    # Psalm 22
    "https://charlesspurgeon.nl/psalm-221-11/",
    "https://charlesspurgeon.nl/psalm-2212-22/",
    "https://charlesspurgeon.nl/psalm-2223-32/",
    # Psalm 23
    "https://charlesspurgeon.nl/psalm-23/",
    # Psalm 24
    "https://charlesspurgeon.nl/psalm-241-6/",
    "https://charlesspurgeon.nl/psalm-247-10/",
    # Psalm 25
    "https://charlesspurgeon.nl/psalm-251-7/",
    "https://charlesspurgeon.nl/psalm-258-15/",
    "https://charlesspurgeon.nl/psalm-2516-22/",
    # Psalm 26
    "https://charlesspurgeon.nl/psalm-261-5/",
    "https://charlesspurgeon.nl/psalm-266-12/",
    # Psalm 27
    "https://charlesspurgeon.nl/psalm-271-6/",
    "https://charlesspurgeon.nl/psalm-277-14/",
    # Psalm 28
    "https://charlesspurgeon.nl/psalm-281-5/",
    "https://charlesspurgeon.nl/psalm-286-9/",
    # Psalm 29
    "https://charlesspurgeon.nl/psalm-291-4/",
    "https://charlesspurgeon.nl/psalm-295-11/",
    # Psalm 30
    "https://charlesspurgeon.nl/psalm-301-6/",
    "https://charlesspurgeon.nl/psalm-307-13/",
    # Psalm 31
    "https://charlesspurgeon.nl/psalm-311-14/",
    "https://charlesspurgeon.nl/psalm-3115-25/",
    # Psalm 32
    "https://charlesspurgeon.nl/psalm-321-5/",
    "https://charlesspurgeon.nl/psalm-326-11/",
    # Psalm 33
    "https://charlesspurgeon.nl/psalm-331-11/",
    "https://charlesspurgeon.nl/psalm-3312-22/",
    # Psalm 34
    "https://charlesspurgeon.nl/psalm-341-11/",
    "https://charlesspurgeon.nl/psalm-3412-23/",
    # Psalm 35
    "https://charlesspurgeon.nl/psalm-351-10/",
    "https://charlesspurgeon.nl/psalm-3511-18/",
    "https://charlesspurgeon.nl/psalm-3519-28/",
    # Psalm 36
    "https://charlesspurgeon.nl/psalm-361-5/",
    "https://charlesspurgeon.nl/psalm-366-13/",
    # Psalm 37
    "https://charlesspurgeon.nl/psalm-371-8/",
    "https://charlesspurgeon.nl/psalm-37-9-15/",
    "https://charlesspurgeon.nl/psalm-3716-24/",
    "https://charlesspurgeon.nl/psalm-3725-33/",
    "https://charlesspurgeon.nl/psalm-3734-40/",
    # Psalm 38
    "https://charlesspurgeon.nl/psalm-381-9/",
    "https://charlesspurgeon.nl/psalm-3810-16/",
    "https://charlesspurgeon.nl/psalm-3817-23/",
    # Psalm 39
    "https://charlesspurgeon.nl/psalm-391-7/",
    "https://charlesspurgeon.nl/psalm-398-14/",
    # Psalm 40
    "https://charlesspurgeon.nl/psalm-401-6/",
    "https://charlesspurgeon.nl/psalm-407-11/",
    "https://charlesspurgeon.nl/psalm-4012-18/",
    # Psalm 41
    "https://charlesspurgeon.nl/psalm-411-7/",
    "https://charlesspurgeon.nl/psalm-418-14/",
    # Psalm 42
    "https://charlesspurgeon.nl/psalm-421-6/",
    "https://charlesspurgeon.nl/psalm-427-12/",
    # Psalm 43
    "https://charlesspurgeon.nl/psalm-43/",
    # Psalm 44
    "https://charlesspurgeon.nl/psalm-441-9/",
    "https://charlesspurgeon.nl/psalm-4410-17/",
    "https://charlesspurgeon.nl/psalm-4418-27/",
    # Psalm 45
    "https://charlesspurgeon.nl/psalm-451-10/",
    "https://charlesspurgeon.nl/psalm-4511-18/",
    # Psalm 46
    "https://charlesspurgeon.nl/psalm-461-4/",
    "https://charlesspurgeon.nl/psalm-465-8/",
    "https://charlesspurgeon.nl/psalm-469-12/",
    # Psalm 47
    "https://charlesspurgeon.nl/psalm-471-5/",
    "https://charlesspurgeon.nl/psalm-476-10/",
    # Psalm 48
    "https://charlesspurgeon.nl/psalm-481-9/",
    "https://charlesspurgeon.nl/psalm-4810-15/",
    # Psalm 49
    "https://charlesspurgeon.nl/psalm-491-13/",
    "https://charlesspurgeon.nl/psalm-4914-21/",
    # Psalm 50
    "https://charlesspurgeon.nl/psalm-501-6/",
    "https://charlesspurgeon.nl/psalm-507-15/",
    "https://charlesspurgeon.nl/psalm-5016-23/",
    # Psalm 51
    "https://charlesspurgeon.nl/psalm-511-8/",
    "https://charlesspurgeon.nl/psalm-519-14/",
    "https://charlesspurgeon.nl/psalm-5115-21/",
    # Psalm 52
    "https://charlesspurgeon.nl/psalm-521-7/",
    "https://charlesspurgeon.nl/psalm-528-11/",
    # Psalm 53
    "https://charlesspurgeon.nl/psalm-53/",
    # Psalm 54
    "https://charlesspurgeon.nl/psalm-54/",
    # Psalm 55
    "https://charlesspurgeon.nl/psalm-551-9/",
    "https://charlesspurgeon.nl/psalm-5510-16/",
    "https://charlesspurgeon.nl/psalm-5517-24/",
    # Psalm 56
    "https://charlesspurgeon.nl/psalm-561-8/",
    "https://charlesspurgeon.nl/psalm-569-14/",
    # Psalm 57
    "https://charlesspurgeon.nl/psalm-571-7/",
    "https://charlesspurgeon.nl/psalm-578-12/",
    # Psalm 58
    "https://charlesspurgeon.nl/psalm-581-6/",
    "https://charlesspurgeon.nl/psalm-587-12/",
    # Psalm 59
    "https://charlesspurgeon.nl/psalm-591-6/",
    "https://charlesspurgeon.nl/psalm-597-14/",
    "https://charlesspurgeon.nl/psalm-5915-18/",
    # Psalm 60
    "https://charlesspurgeon.nl/psalm-601-7/",
    "https://charlesspurgeon.nl/psalm-608-14/",
    # Psalm 61
    "https://charlesspurgeon.nl/psalm-611-5/",
    "https://charlesspurgeon.nl/psalm-616-9/",
    # Psalm 62
    "https://charlesspurgeon.nl/psalm-621-5/",
    "https://charlesspurgeon.nl/psalm-626-13/",
    # Psalm 63
    "https://charlesspurgeon.nl/psalm-631-6/",
    "https://charlesspurgeon.nl/psalm-637-12/",
    # Psalm 64
    "https://charlesspurgeon.nl/psalm-641-7/",
    "https://charlesspurgeon.nl/psalm-648-11/",
    # Psalm 65
    "https://charlesspurgeon.nl/psalm-651-5/",
    "https://charlesspurgeon.nl/psalm-656-9/",
    "https://charlesspurgeon.nl/psalm-6510-14/",
    # Psalm 66
    "https://charlesspurgeon.nl/psalm-661-7/",
    "https://charlesspurgeon.nl/psalm-668-15/",
    "https://charlesspurgeon.nl/psalm-6616-20/",
    # Psalm 67
    "https://charlesspurgeon.nl/psalm-671-5/",
    "https://charlesspurgeon.nl/psalm-676-8/",
    # Psalm 68
    "https://charlesspurgeon.nl/psalm-681-7/",
    "https://charlesspurgeon.nl/psalm-688-15/",
    "https://charlesspurgeon.nl/psalm-6816-20/",
    "https://charlesspurgeon.nl/psalm-6821-28/",
    "https://charlesspurgeon.nl/psalm-6829-36/",
    # Psalm 69
    "https://charlesspurgeon.nl/psalm-691-5/",
    "https://charlesspurgeon.nl/psalm-696-13/",
    "https://charlesspurgeon.nl/psalm-6914-19/",
    "https://charlesspurgeon.nl/psalm-6920-29/",
    "https://charlesspurgeon.nl/psalm-6930-37/",
    # Psalm 70
    "https://charlesspurgeon.nl/psalm-70/",
    # Psalm 71
    "https://charlesspurgeon.nl/psalm-711-4/",
    "https://charlesspurgeon.nl/psalm-7114-18/",
    "https://charlesspurgeon.nl/psalm-7119-24/",
    # Psalm 72
    "https://charlesspurgeon.nl/psalm-721-7/",
    "https://charlesspurgeon.nl/psalm-728-14/",
    "https://charlesspurgeon.nl/psalm-7215-20/",
    # Psalm 73
    "https://charlesspurgeon.nl/psalm-732-14/",
    "https://charlesspurgeon.nl/psalm-7315-24/",
    "https://charlesspurgeon.nl/psalm-731-25-28/",
    # Psalm 74
    "https://charlesspurgeon.nl/psalm-741-8/",
    "https://charlesspurgeon.nl/psalm-749-17/",
    "https://charlesspurgeon.nl/psalm-7418-23/",
    # Psalm 75
    "https://charlesspurgeon.nl/psalm-751-6/",
    "https://charlesspurgeon.nl/psalm-757-11/",
    # Psalm 76
    "https://charlesspurgeon.nl/psalm-761-7/",
    "https://charlesspurgeon.nl/psalm-768-13/",
    # Psalm 77
    "https://charlesspurgeon.nl/psalm-771-10/",
    "https://charlesspurgeon.nl/psalm-7711-16/",
    "https://charlesspurgeon.nl/psalm-7717-21/",
    # Psalm 78
    "https://charlesspurgeon.nl/psalm-781-8/",
    "https://charlesspurgeon.nl/psalm-789-25/",
    "https://charlesspurgeon.nl/psalm-7826-41/",
    "https://charlesspurgeon.nl/psalm-7842-53/",
    "https://charlesspurgeon.nl/psalm-7854-66/",
    "https://charlesspurgeon.nl/psalm-7867-72/",
    # Psalm 79
    "https://charlesspurgeon.nl/psalm-791-4/",
    "https://charlesspurgeon.nl/psalm-795-13/",
    # Psalm 80
    "https://charlesspurgeon.nl/psalm-801-8/",
    "https://charlesspurgeon.nl/psalm-809-20/",
    # Psalm 81
    "https://charlesspurgeon.nl/psalm-811-8/",
    "https://charlesspurgeon.nl/psalm-819-17/",
    # Psalm 82
    "https://charlesspurgeon.nl/psalm-82/",
    # Psalm 83
    "https://charlesspurgeon.nl/psalm-831-5/",
    "https://charlesspurgeon.nl/psalm-836-9/",
    "https://charlesspurgeon.nl/psalm-8310-13/",
    "https://charlesspurgeon.nl/psalm-8314-19/",
    # Psalm 84
    "https://charlesspurgeon.nl/psalm-841-5/",
    "https://charlesspurgeon.nl/psalm-846-9/",
    "https://charlesspurgeon.nl/psalm-8410-13/",
    # Psalm 85
    "https://charlesspurgeon.nl/psalm-851-8/",
    "https://charlesspurgeon.nl/psalm-859-14/",
    # Psalm 86
    "https://charlesspurgeon.nl/psalm-861-7/",
    "https://charlesspurgeon.nl/psalm-868-13/",
    "https://charlesspurgeon.nl/psalm-8614-17/",
    # Psalm 87
    "https://charlesspurgeon.nl/psalm-871-3/",
    "https://charlesspurgeon.nl/psalm-874-7/",
    # Psalm 88
    "https://charlesspurgeon.nl/psalm-881-10/",
    "https://charlesspurgeon.nl/psalm-8811-19/",
    # Psalm 89
    "https://charlesspurgeon.nl/psalm-891-5/",
    "https://charlesspurgeon.nl/psalm-896-15/",
    "https://charlesspurgeon.nl/psalm-8916-19/",
    "https://charlesspurgeon.nl/psalm-8920-24/",
    "https://charlesspurgeon.nl/psalm-8925-30/",
    "https://charlesspurgeon.nl/psalm-8931-38/",
    "https://charlesspurgeon.nl/psalm-8939-46/",
    "https://charlesspurgeon.nl/psalm-8947-53/",
    # Psalm 90
    "https://charlesspurgeon.nl/psalm-901-6/",
    "https://charlesspurgeon.nl/psalm-907-11/",
    "https://charlesspurgeon.nl/psalm-9012-17/",
    # Psalm 91
    "https://charlesspurgeon.nl/psalm-911-4/",
    "https://charlesspurgeon.nl/psalm-915-10/",
    "https://charlesspurgeon.nl/psalm-9111-16/",
    # Psalm 92
    "https://charlesspurgeon.nl/psalm-921-5/",
    "https://charlesspurgeon.nl/psalm-926-10/",
    "https://charlesspurgeon.nl/psalm-9211-16/",
    # Psalm 93
    "https://charlesspurgeon.nl/psalm-93/",
    # Psalm 94
    "https://charlesspurgeon.nl/psalm-941-7/",
    "https://charlesspurgeon.nl/psalm-948-15/",
    "https://charlesspurgeon.nl/psalm-9416-23/",
    # Psalm 95
    "https://charlesspurgeon.nl/psalm-951-5/",
    "https://charlesspurgeon.nl/psalm-956-11/",
    # Psalm 96
    "https://charlesspurgeon.nl/psalm-961-6/",
    "https://charlesspurgeon.nl/psalm-967-13/",
    # Psalm 97
    "https://charlesspurgeon.nl/psalm-971-6/",
    "https://charlesspurgeon.nl/psalm-977-12/",
    # Psalm 98
    "https://charlesspurgeon.nl/psalm-981-3/",
    "https://charlesspurgeon.nl/psalm-984-9/",
    # Psalm 99
    "https://charlesspurgeon.nl/psalm-991-3/",
    "https://charlesspurgeon.nl/psalm-994-5/",
    "https://charlesspurgeon.nl/psalm-996-9/",
    # Psalm 100
    "https://charlesspurgeon.nl/psalm-100/",
    # Psalm 101
    "https://charlesspurgeon.nl/psalm-1011-4/",
    "https://charlesspurgeon.nl/psalm-1015-8/",
    # Psalm 102
    "https://charlesspurgeon.nl/psalm-1021-12/",
    "https://charlesspurgeon.nl/psalm-10213-29/",
    # Psalm 103
    "https://charlesspurgeon.nl/psalm-1031-10/",
    "https://charlesspurgeon.nl/psalm-10311-22/",
    # Psalm 104
    "https://charlesspurgeon.nl/psalm-1041-6/",
    "https://charlesspurgeon.nl/psalm-1047-18/",
    "https://charlesspurgeon.nl/psalm-10419-30/",
    "https://charlesspurgeon.nl/psalm-10431-35/",
    # Psalm 105
    "https://charlesspurgeon.nl/psalm-1051-15/",
    "https://charlesspurgeon.nl/psalm-10516-23/",
    "https://charlesspurgeon.nl/psalm-10524-45/",
    # Psalm 106
    "https://charlesspurgeon.nl/psalm-1061-12/",
    "https://charlesspurgeon.nl/psalm-10613-23/",
    "https://charlesspurgeon.nl/psalm-10624-39/",
    "https://charlesspurgeon.nl/psalm-10640-48/",
    # Psalm 107
    "https://charlesspurgeon.nl/psalm-1071-9/",
    "https://charlesspurgeon.nl/psalm-10710-22/",
    "https://charlesspurgeon.nl/psalm-10723-32/",
    "https://charlesspurgeon.nl/psalm-10733-43/",
    # Psalm 108
    "https://charlesspurgeon.nl/psalm-1081-6/",
    "https://charlesspurgeon.nl/psalm-1087-14/",
    # Psalm 109
    "https://charlesspurgeon.nl/psalm-1091-5/",
    "https://charlesspurgeon.nl/psalm-1096-20/",
    "https://charlesspurgeon.nl/psalm-10921-31/",
    # Psalm 110
    "https://charlesspurgeon.nl/psalm-1101-3/",
    "https://charlesspurgeon.nl/psalm-1104-7/",
    # Psalm 111
    "https://charlesspurgeon.nl/psalm-111/",
    # Psalm 112
    "https://charlesspurgeon.nl/psalm-1121-5/",
    "https://charlesspurgeon.nl/psalm-1126-10/",
    # Psalm 113
    "https://charlesspurgeon.nl/psalm-1131-5/",
    "https://charlesspurgeon.nl/psalm-1136-9/",
    # Psalm 114
    "https://charlesspurgeon.nl/psalm-114/",
    # Psalm 115
    "https://charlesspurgeon.nl/psalm-1151-2/",
    "https://charlesspurgeon.nl/psalm-1153-8/",
    "https://charlesspurgeon.nl/psalm-1159-18/",
    # Psalm 116
    "https://charlesspurgeon.nl/psalm-1161-8/",
    "https://charlesspurgeon.nl/psalm-1169-13/",
    "https://charlesspurgeon.nl/psalm-11614-19/",
    # Psalm 117
    "https://charlesspurgeon.nl/psalm-117/",
    # Psalm 118
    "https://charlesspurgeon.nl/psalm-1181-4/",
    "https://charlesspurgeon.nl/psalm-185-14/",
    "https://charlesspurgeon.nl/psalm-11815-21/",
    "https://charlesspurgeon.nl/psalm-11822-29/",
    # Psalm 119
    "https://charlesspurgeon.nl/psalm-1191-8/",
    "https://charlesspurgeon.nl/psalm-1199-16/",
    "https://charlesspurgeon.nl/psalm-11917-24/",
    "https://charlesspurgeon.nl/psalm-11925-32/",
    "https://charlesspurgeon.nl/psalm-11933-40/",
    "https://charlesspurgeon.nl/psalm-11941-48/",
    "https://charlesspurgeon.nl/psalm-11949-56/",
    "https://charlesspurgeon.nl/psalm-11957-64/",
    "https://charlesspurgeon.nl/psalm-11965-72/",
    "https://charlesspurgeon.nl/psalm-11973-80/",
    "https://charlesspurgeon.nl/psalm-11981-88/",
    "https://charlesspurgeon.nl/psalm-11989-96/",
    "https://charlesspurgeon.nl/psalm-11997-104/",
    "https://charlesspurgeon.nl/psalm-119105-112/",
    "https://charlesspurgeon.nl/psalm-119113-120/",
    "https://charlesspurgeon.nl/psalm-119121-128/",
    "https://charlesspurgeon.nl/psalm-119129-136/",
    "https://charlesspurgeon.nl/psalm-119137-144/",
    "https://charlesspurgeon.nl/psalm-119145-152/",
    "https://charlesspurgeon.nl/psalm-119153-160/",
    "https://charlesspurgeon.nl/psalm-119161-168/",
    "https://charlesspurgeon.nl/psalm-119169-176/",
    # Psalm 120
    "https://charlesspurgeon.nl/psalm-120/",
    # Psalm 121
    "https://charlesspurgeon.nl/psalm-1211-4/",
    "https://charlesspurgeon.nl/psalm-1215-8/",
    # Psalm 122
    "https://charlesspurgeon.nl/psalm-1221-5/",
    "https://charlesspurgeon.nl/psalm-1226-9/",
    # Psalm 123
    "https://charlesspurgeon.nl/psalm-123/",
    # Psalm 124
    "https://charlesspurgeon.nl/psalm-1241-5/",
    "https://charlesspurgeon.nl/psalm-1246-8/",
    # Psalm 125
    "https://charlesspurgeon.nl/psalm-125/",
    # Psalm 126
    "https://charlesspurgeon.nl/psalm-126/",
    # Psalm 127
    "https://charlesspurgeon.nl/psalm-127/",
    # Psalm 128
    "https://charlesspurgeon.nl/psalm-128/",
    # Psalm 129
    "https://charlesspurgeon.nl/psalm-1291-4/",
    "https://charlesspurgeon.nl/psalm-1295-8/",
    # Psalm 130
    "https://charlesspurgeon.nl/psalm-1301-4/",
    "https://charlesspurgeon.nl/psalm-1305-8/",
    # Psalm 131
    "https://charlesspurgeon.nl/psalm-131/",
    # Psalm 132
    "https://charlesspurgeon.nl/psalm-1321-10/",
    "https://charlesspurgeon.nl/psalm-13211-18/",
    # Psalm 133
    "https://charlesspurgeon.nl/psalm-133/",
    # Psalm 134
    "https://charlesspurgeon.nl/psalm-134/",
    # Psalm 135
    "https://charlesspurgeon.nl/psalm-1351-7/",
    "https://charlesspurgeon.nl/psalm-1358-14/",
    "https://charlesspurgeon.nl/psalm-13515-21/",
    # Psalm 136
    "https://charlesspurgeon.nl/psalm-1361-9/",
    "https://charlesspurgeon.nl/psalm-13610-16/",
    "https://charlesspurgeon.nl/psalm-13617-26/",
    # Psalm 137
    "https://charlesspurgeon.nl/psalm-1371-6/",
    "https://charlesspurgeon.nl/psalm-1377-9/",
    # Psalm 138
    "https://charlesspurgeon.nl/psalm-1381-3/",
    "https://charlesspurgeon.nl/psalm-1384-8/",
    # Psalm 139
    "https://charlesspurgeon.nl/psalm-1391-6/",
    "https://charlesspurgeon.nl/psalm-1397-12/",
    "https://charlesspurgeon.nl/psalm-13913-18/",
    "https://charlesspurgeon.nl/psalm-13919-24/",
    # Psalm 140
    "https://charlesspurgeon.nl/psalm-1401-6/",
    "https://charlesspurgeon.nl/psalm-1407-14/",
    # Psalm 141
    "https://charlesspurgeon.nl/psalm-1411-6/",
    "https://charlesspurgeon.nl/psalm-1417-10/",
    # Psalm 142
    "https://charlesspurgeon.nl/psalm-142/",
    # Psalm 143
    "https://charlesspurgeon.nl/psalm-1431-6/",
    "https://charlesspurgeon.nl/psalm-1437-12/",
    # Psalm 144
    "https://charlesspurgeon.nl/psalm-1441-8/",
    "https://charlesspurgeon.nl/psalm-1449-15/",
    # Psalm 145
    "https://charlesspurgeon.nl/psalm-1451-7/",
    "https://charlesspurgeon.nl/psalm-1458-16/",
    "https://charlesspurgeon.nl/psalm-14517-21/",
    # Psalm 146
    "https://charlesspurgeon.nl/psalm-1461-5/",
    "https://charlesspurgeon.nl/psalm-1466-10/",
    # Psalm 147
    "https://charlesspurgeon.nl/psalm-1471-6/",
    "https://charlesspurgeon.nl/psalm-1477-11/",
    "https://charlesspurgeon.nl/psalm-14712-20/",
    # Psalm 148
    "https://charlesspurgeon.nl/psalm-1481-6/",
    "https://charlesspurgeon.nl/psalm-1487-14/",
    # Psalm 149
    "https://charlesspurgeon.nl/psalm-149/",
    # Psalm 150
    "https://charlesspurgeon.nl/psalm-150/",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SchriftInzicht/1.0",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "nl,en;q=0.5",
}

DELAY = 2  # seconds between requests


def parse_title(title_text: str) -> tuple[int, int | None, int | None]:
    """Parse psalm number and verse range from title like 'Psalm 1:1-3' or 'Psalm 15'."""
    title_text = title_text.split("|")[0].strip()
    # Match "Psalm N:V1-V2" or "Psalm N"
    m = re.match(r"Psalm\s+(\d+)(?::(\d+)-(\d+))?", title_text)
    if m:
        psalm = int(m.group(1))
        v_start = int(m.group(2)) if m.group(2) else None
        v_end = int(m.group(3)) if m.group(3) else None
        return psalm, v_start, v_end
    return 0, None, None


def extract_content(html: str) -> tuple[str, str]:
    """Extract title and entry-content text from HTML."""
    soup = BeautifulSoup(html, "html.parser")

    # Get title
    title_tag = soup.find("title")
    title = title_tag.get_text() if title_tag else ""

    # Find entry-content div
    content_div = soup.find("div", class_="entry-content")
    if not content_div:
        return title, ""

    # Remove script, style, nav elements
    for tag in content_div.find_all(["script", "style", "nav", "footer", "iframe"]):
        tag.decompose()

    # Remove share/donation buttons and navigation links
    for tag in content_div.find_all("div", class_=re.compile(r"sharedaddy|sd-sharing|steun|donation|post-nav|nav-links")):
        tag.decompose()

    # Remove "Steun Ons" sections and navigation arrows
    for tag in content_div.find_all(["a", "span", "div"]):
        text = tag.get_text(strip=True)
        if text in ("Steun Ons", "DELEN", "Vorige", "Volgende"):
            tag.decompose()

    # Get clean text
    text = content_div.get_text(separator="\n")

    # Clean up whitespace and fix encoding artifacts
    lines = []
    for line in text.split("\n"):
        line = line.strip()
        # Fix common encoding issues
        line = line.replace("\x96", "\u2013")  # en-dash
        line = line.replace("\x97", "\u2014")  # em-dash
        line = line.replace("\x93", "\u201c")  # left double quote
        line = line.replace("\x94", "\u201d")  # right double quote
        line = line.replace("\x92", "\u2019")  # right single quote
        line = line.replace("\x91", "\u2018")  # left single quote
        if line:
            lines.append(line)

    # Remove trailing navigation/sharing artifacts
    while lines and lines[-1] in ("", "Steun Ons", "DELEN", "\u00ab Vorige", "Volgende \u00bb", "\u00ab", "\u00bb"):
        lines.pop()

    return title, "\n\n".join(lines)


def scrape_psalm_url(session: requests.Session, url: str) -> dict | None:
    """Scrape a single psalm page and return structured data."""
    try:
        resp = session.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        resp.encoding = "utf-8"

        title, text = extract_content(resp.text)
        if not text:
            print(f"  WARNING: No content extracted from {url}")
            return None

        psalm, v_start, v_end = parse_title(title)
        if psalm == 0:
            print(f"  WARNING: Could not parse psalm from title: {title}")
            return None

        return {
            "book": "Psalmen",
            "chapter": psalm,
            "verse": v_start if v_start else 1,
            "verse_end": v_end,
            "text": text,
            "source_url": url,
        }
    except requests.RequestException as e:
        print(f"  ERROR fetching {url}: {e}")
        return None


def main():
    test_mode = "--test" in sys.argv
    urls = PSALM_URLS[:10] if test_mode else PSALM_URLS  # First 10 URLs ~= psalms 1-5

    output_path = Path(__file__).parent / "scraped" / "spurgeon_schatkamer_nl.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Check for existing progress (resume support)
    results = []
    scraped_urls = set()
    if output_path.exists() and not test_mode:
        try:
            existing = json.loads(output_path.read_text(encoding="utf-8"))
            results = existing
            scraped_urls = {r.get("source_url") for r in results if r.get("source_url")}
            print(f"Resuming: {len(results)} items already scraped")
        except (json.JSONDecodeError, KeyError):
            pass

    session = requests.Session()
    errors = []
    total = len(urls)

    for i, url in enumerate(urls, 1):
        if url in scraped_urls:
            print(f"[{i}/{total}] SKIP (already scraped): {url}")
            continue

        print(f"[{i}/{total}] Fetching: {url}")
        result = scrape_psalm_url(session, url)

        if result:
            results.append(result)
            print(f"  -> Psalm {result['chapter']}:{result['verse']}-{result['verse_end']} ({len(result['text'])} chars)")
        else:
            errors.append(url)

        # Save after each page (crash safety)
        output_path.write_text(
            json.dumps(results, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )

        if i < total:
            time.sleep(DELAY)

    # Sort results by psalm number, then verse start
    results.sort(key=lambda r: (r["chapter"], r["verse"] or 0))

    # Final save (sorted)
    output_path.write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    # Report
    psalms_covered = sorted(set(r["chapter"] for r in results))
    print(f"\n{'='*60}")
    print(f"RAPPORT")
    print(f"{'='*60}")
    print(f"Totaal pagina's gescraped: {len(results)}")
    print(f"Psalmen met data: {len(psalms_covered)}/150")
    print(f"Errors: {len(errors)}")
    if errors:
        print(f"Gefaalde URLs:")
        for e in errors:
            print(f"  - {e}")
    print(f"Output: {output_path}")

    # Check missing psalms
    missing = [p for p in range(1, 151) if p not in psalms_covered]
    if missing:
        print(f"Ontbrekende psalmen: {missing}")


if __name__ == "__main__":
    main()
