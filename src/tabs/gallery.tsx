import React from 'react'
import { Theme } from "@radix-ui/themes"
import '../globals.css'
import AnnotationGallery from '~components/AnnotationGallery'

const Gallery: React.FC = () => {
  return (
    <Theme accentColor="crimson" grayColor="sand" radius="large" scaling="95%" className="dark">
      <AnnotationGallery />
    </Theme>
  )
}

export default Gallery
