terraform {
    required_version = ">= 1.0.5"
    required_providers {
        aws = {
            version = ">= 3.54.0"
            source  = "hashicorp/aws"
        }
    }
}

provider "aws" {
    alias  = "root"
    region = var.aws_region

    default_tags {
        tags = {
            Environment       = var.environment
            Application       = "TextGrab"
            "Support:Contact" = "textgrab.io@gmail.com"
            Region            = var.aws_region
        }
    }
}