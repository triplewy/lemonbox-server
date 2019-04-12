#!/bin/bash
git pull
cd ec2-mysql
npm i
cd ..
sudo systemctl restart lemonbox
