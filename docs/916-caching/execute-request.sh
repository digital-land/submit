#!/bin/bash

urls=(
  "http://localhost:8085/organisations"
  "http://localhost:8085/organisations/local-authority%3ALBH"
  "http://localhost:8085/organisations/local-authority%3ALBH/article-4-direction-area/missing%20value/permitted-development-rights"
  "http://localhost:8085/organisations/local-authority%3ALBH/article-4-direction/missing%20value/document-url"
  "http://localhost:8085/organisations/local-authority%3ALBH/article-4-direction/missing%20value/documentation-url"
  "http://localhost:8085/organisations/local-authority%3ALIV/brownfield-land/missing%20value/GeoY"
  "http://localhost:8085/organisations/local-authority%3ALIV/brownfield-land/missing%20value/SiteNameAddress"
  "http://localhost:8085/organisations/local-authority%3ALIV/brownfield-land/unknown%20entity%20-%20missing%20reference/entity"
  "http://localhost:8085/organisations/local-authority:BBD"
  "http://localhost:8085/organisations/local-authority:BBD/brownfield-land"
  "http://localhost:8085/organisations/local-authority:BBD/brownfield-land/data"
  "http://localhost:8085/organisations/local-authority:BBD/brownfield-land/overview"
  "http://localhost:8085/organisations/local-authority:LBH"
  "http://localhost:8085/organisations/local-authority:LBH/article-4-direction"
  "http://localhost:8085/organisations/local-authority:LBH/article-4-direction-area"
  "http://localhost:8085/organisations/local-authority:LBH/article-4-direction-area/missing%20value/permitted-development-rights/2"
  "http://localhost:8085/organisations/local-authority:LBH/article-4-direction-area/overview"
  "http://localhost:8085/organisations/local-authority:LBH/article-4-direction/data"
  "http://localhost:8085/organisations/local-authority:LBH/article-4-direction/overview"
  "http://localhost:8085/organisations/local-authority:LBH/tree"
  "http://localhost:8085/organisations/local-authority:LBH/tree-preservation-order"
  "http://localhost:8085/organisations/local-authority:LBH/tree-preservation-order/overview"
  "http://localhost:8085/organisations/local-authority:LBH/tree/data"
  "http://localhost:8085/organisations/local-authority:LBH/tree/missing%20value/reference/entry"
  "http://localhost:8085/organisations/local-authority:LBH/tree/overview"
  "http://localhost:8085/organisations/local-authority:LBH/tree/unknown%20entity%20-%20missing%20reference/entity/entry"
  "http://localhost:8085/organisations/local-authority:LIV"
  "http://localhost:8085/organisations/local-authority:LIV/brownfield-land"
  "http://localhost:8085/organisations/local-authority:LIV/brownfield-land/data"
  "http://localhost:8085/organisations/local-authority:LIV/brownfield-land/invalid%20WKT/GeoX,GeoY/entry"
  "http://localhost:8085/organisations/local-authority:LIV/brownfield-land/missing%20value/GeoX/entry"
  "http://localhost:8085/organisations/local-authority:LIV/brownfield-land/overview"
)

for url in "${urls[@]}"; do
  curl "$url" > /dev/null 2>&1
done
